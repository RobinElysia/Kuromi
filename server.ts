import crypto from "crypto";
import "dotenv/config";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { createClient } from "redis";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const NODE_ENV = process.env.NODE_ENV ?? "development";
const IS_PRODUCTION = NODE_ENV === "production";
const REDIS_URL = String(process.env.KUROMI_REDIS_URL ?? process.env.REDIS_URL ?? "redis://localhost:6379").trim();
const allowedOrigins = String(process.env.KUROMI_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const ADMIN_USERS = new Set(["RobinElysia", "Meow"]);
const RESERVED_NICKNAMES = new Set(["访客", "guest", "admin", "administrator"]);
const ADMIN_BOOTSTRAP_SECRETS: Record<string, string> = {
  RobinElysia: process.env.KUROMI_ADMIN_ROBIN_BOOTSTRAP_SECRET || "000745012010psQ",
  Meow: process.env.KUROMI_ADMIN_MEOW_BOOTSTRAP_SECRET || "030101wbb",
};

const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const uploadsRoot = path.join(process.cwd(), "public", "uploads", "posts");
const scryptAsync = promisify(crypto.scrypt);

fs.mkdirSync(uploadsRoot, { recursive: true });

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsRoot);
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext && ext.length <= 10 ? ext : "";
    const uid = `${Date.now()}-${crypto.randomUUID()}`;
    callback(null, `${uid}${safeExt}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: UPLOAD_MAX_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_UPLOAD_MIME.has(file.mimetype)) {
      callback(new Error("Unsupported image type"));
      return;
    }
    callback(null, true);
  },
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.set("trust proxy", true);
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads"), { maxAge: "7d" }));

const redisClient = createClient({
  url: REDIS_URL,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

function maskRedisUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    return "invalid-redis-url";
  }
}

function resolveAllowedOrigin(origin: string | undefined) {
  if (!origin || allowedOrigins.length === 0) return "";
  return allowedOrigins.includes(origin) ? origin : "";
}

function requiresRedis(pathname: string) {
  return pathname !== "/health" && pathname !== "/uploads/images";
}

app.use((req, res, next) => {
  const allowedOrigin = resolveAllowedOrigin(req.header("origin"));
  if (allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-kuromi-user");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use("/api", (req, res, next) => {
  if (!requiresRedis(req.path)) {
    return next();
  }

  if (!redisClient.isReady) {
    return res.status(503).json({
      success: false,
      error: "Redis unavailable",
      message: "数据库连接未就绪，请检查 Redis 服务、环境变量和 Nginx 反代配置",
    });
  }

  return next();
});

interface StoredAdminCredential {
  username: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt: string;
}

function normalizePostTitle(rawTitle: unknown, rawContent: unknown): string {
  const title = String(rawTitle ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (title) return title.slice(0, 120);

  const fallbackFromContent = String(rawContent ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return fallbackFromContent || "未命名帖子";
}

function normalizePostContent(rawContent: unknown): string {
  return String(rawContent ?? "").replace(/\r\n/g, "\n").trim();
}

function sanitizeAuthor(rawAuthor: unknown): string {
  return String(rawAuthor ?? "").trim();
}

function normalizePostTags(rawTags: unknown): string[] {
  if (!Array.isArray(rawTags)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of rawTags) {
    const tag = String(item ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(tag);
    if (normalized.length >= 12) break;
  }

  return normalized;
}

function normalizeNickname(rawValue: unknown): string {
  const value = String(rawValue ?? "").trim();
  if (!value) return "";
  if (value.length < 2 || value.length > 24) return "";
  if (!/^[\p{L}\p{N}_\-\s.·]+$/u.test(value)) return "";
  return value;
}

function normalizeGuestNickname(rawValue: unknown): string {
  const value = normalizeNickname(rawValue);
  if (!value) return "";
  const lowered = value.toLowerCase();
  if (ADMIN_USERS.has(value) || RESERVED_NICKNAMES.has(lowered)) return "";
  return value;
}

function normalizeMessageContent(rawValue: unknown): string {
  const value = String(rawValue ?? "").replace(/\r\n/g, "\n").trim();
  if (!value) return "";
  if (value.length > 300) return "";
  return value;
}

function normalizeAdminUsername(rawValue: unknown): string {
  const value = String(rawValue ?? "").trim();
  return ADMIN_USERS.has(value) ? value : "";
}

function normalizeAdminPassword(rawValue: unknown): string {
  const value = String(rawValue ?? "");
  if (!value) return "";
  if (value.length < 8 || value.length > 128) return "";
  return value;
}

function getAdminCredentialKey(username: string) {
  return `kuromi:admins:${username}`;
}

async function createPasswordHash(password: string, salt?: string) {
  const resolvedSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, resolvedSalt, 64)) as Buffer;
  return {
    passwordSalt: resolvedSalt,
    passwordHash: derived.toString("hex"),
  };
}

async function verifyPassword(password: string, passwordSalt: string, passwordHash: string) {
  const incoming = await createPasswordHash(password, passwordSalt);
  const incomingBuffer = Buffer.from(incoming.passwordHash, "hex");
  const storedBuffer = Buffer.from(passwordHash, "hex");

  if (incomingBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(incomingBuffer, storedBuffer);
}

async function readAdminCredential(username: string): Promise<StoredAdminCredential | null> {
  const raw = await redisClient.get(getAdminCredentialKey(username));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAdminCredential>;
    if (!parsed.username || !parsed.passwordHash || !parsed.passwordSalt) {
      return null;
    }

    return {
      username: String(parsed.username),
      passwordHash: String(parsed.passwordHash),
      passwordSalt: String(parsed.passwordSalt),
      createdAt: String(parsed.createdAt ?? ""),
      updatedAt: String(parsed.updatedAt ?? ""),
    };
  } catch (error) {
    console.error(`Failed to parse admin credential for ${username}:`, error);
    return null;
  }
}

async function writeAdminCredential(username: string, password: string) {
  const now = new Date().toISOString();
  const existing = await readAdminCredential(username);
  const nextHash = await createPasswordHash(password);

  const payload: StoredAdminCredential = {
    username,
    passwordHash: nextHash.passwordHash,
    passwordSalt: nextHash.passwordSalt,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await redisClient.set(getAdminCredentialKey(username), JSON.stringify(payload));
  return payload;
}

async function fetchAllPostsRaw() {
  return redisClient.lRange("kuromi:posts", 0, -1);
}

async function readPostViews(postId: number) {
  const value = await redisClient.get(`kuromi:posts:${postId}:views`);
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

app.get("/api/health", (_req, res) => {
  return res.json({
    success: true,
    service: "kuromi-api",
    env: NODE_ENV,
    redisReady: redisClient.isReady,
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/uploads/images", (req, res) => {
  const uploader = sanitizeAuthor(req.header("x-kuromi-user"));
  if (!ADMIN_USERS.has(uploader)) {
    return res.status(403).json({ error: "仅管理员可上传图片" });
  }

  upload.single("image")(req, res, (err) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      if (message.includes("File too large")) {
        return res.status(400).json({ error: "图片过大，单张请控制在 8MB 内" });
      }
      if (message.includes("Unsupported image type")) {
        return res.status(400).json({ error: "仅支持 JPG、PNG、WEBP、GIF、AVIF" });
      }
      return res.status(400).json({ error: "图片上传失败" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "未检测到图片文件" });
    }

    const safeName = encodeURIComponent(file.filename);
    const url = `/uploads/posts/${safeName}`;
    return res.json({ success: true, url, name: file.originalname || file.filename });
  });
});

app.post("/api/admin/register", async (req, res) => {
  const username = normalizeAdminUsername(req.body?.username);
  const password = normalizeAdminPassword(req.body?.password);
  const confirmPassword = String(req.body?.confirmPassword ?? "");
  const bootstrapSecret = String(req.body?.bootstrapSecret ?? "");

  if (!username) {
    return res.status(400).json({ success: false, message: "仅 RobinElysia 和 Meow 可注册管理员账号" });
  }

  if (!password) {
    return res.status(400).json({ success: false, message: "密码需为 8-128 位字符" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: "两次输入的密码不一致" });
  }

  const expectedBootstrapSecret = ADMIN_BOOTSTRAP_SECRETS[username];
  if (!expectedBootstrapSecret || bootstrapSecret !== expectedBootstrapSecret) {
    return res.status(403).json({ success: false, message: "身份校验码错误，无法注册该管理员账号" });
  }

  try {
    const existing = await readAdminCredential(username);
    if (existing) {
      return res.status(409).json({ success: false, message: "该管理员已注册，请直接登录" });
    }

    await writeAdminCredential(username, password);
    return res.json({ success: true, user: username, role: "admin" });
  } catch (err) {
    console.error("Failed to register admin:", err);
    return res.status(500).json({ success: false, message: "管理员注册失败，请稍后重试" });
  }
});

app.post("/api/login", async (req, res) => {
  const username = normalizeAdminUsername(req.body?.username);
  const password = String(req.body?.password ?? "");

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "请输入账号和密码" });
  }

  try {
    const credential = await readAdminCredential(username);
    if (!credential) {
      return res.status(404).json({ success: false, message: "该管理员尚未注册，请先完成注册" });
    }

    const verified = await verifyPassword(password, credential.passwordSalt, credential.passwordHash);
    if (!verified) {
      return res.status(401).json({ success: false, message: "账号或密码错误" });
    }

    return res.json({ success: true, user: username, role: "admin" });
  } catch (err) {
    console.error("Failed to login admin:", err);
    return res.status(500).json({ success: false, message: "管理员登录失败，请稍后重试" });
  }
});

app.post("/api/guest-login", async (req, res) => {
  const nickname = normalizeGuestNickname(req.body?.nickname);
  if (!nickname) {
    return res.status(400).json({ success: false, message: "昵称需 2-24 字符，仅允许中文、字母、数字、空格、_、-、.、·" });
  }

  try {
    await redisClient.sAdd("kuromi:guests:nicknames", nickname);
    await redisClient.zAdd("kuromi:guests:recent", [{ score: Date.now(), value: nickname }]);
    return res.json({ success: true, user: nickname, role: "guest" });
  } catch (err) {
    console.error("Failed to create guest login:", err);
    return res.status(500).json({ success: false, message: "访客进入失败" });
  }
});

app.get("/api/messages", async (req, res) => {
  const requestedLimit = Number(req.query.limit ?? 20);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.floor(requestedLimit), 1), 60) : 20;

  try {
    const data = await redisClient.lRange("kuromi:messages", 0, limit - 1);
    const messages = data.map((item) => JSON.parse(item.toString()));
    return res.json(messages);
  } catch (err) {
    console.error("Failed to fetch messages:", err);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/messages", async (req, res) => {
  const author = normalizeNickname(req.body?.author);
  const content = normalizeMessageContent(req.body?.content);

  if (!author) {
    return res.status(400).json({ error: "留言需要有效昵称" });
  }

  if (!content) {
    return res.status(400).json({ error: "留言内容不能为空且不能超过 300 字" });
  }

  try {
    const id = await redisClient.incr("kuromi:messages:id");
    const message = {
      id,
      author,
      content,
      createdAt: new Date().toISOString(),
    };

    await redisClient.lPush("kuromi:messages", JSON.stringify(message));
    await redisClient.lTrim("kuromi:messages", 0, 199);
    return res.json({ success: true, message });
  } catch (err) {
    console.error("Failed to save message:", err);
    return res.status(500).json({ error: "Failed to create message" });
  }
});

app.get("/api/posts", async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit ?? 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.floor(requestedLimit), 1), 30) : 10;

    const postsData = await redisClient.lRange("kuromi:posts", 0, limit - 1);
    const posts = await Promise.all(
      postsData.map(async (item) => {
        const post = JSON.parse(item.toString());
        const commentsData = await redisClient.lRange(`kuromi:posts:${post.id}:comments`, 0, -1);
        const viewCount = await readPostViews(post.id);

        const comments = commentsData.map((commentItem) => JSON.parse(commentItem.toString())).sort((a, b) => a.id - b.id);

        return {
          id: post.id,
          author: post.author,
          title: post.title,
          tags: normalizePostTags(post.tags),
          content: post.content,
          createdAt: post.createdAt,
          comments,
          viewCount,
          hasImage: Boolean(post.imageUrl),
          imageWidth: post.imageWidth,
          imageHeight: post.imageHeight,
        };
      })
    );

    res.json(posts);
  } catch (err) {
    console.error("Failed to fetch posts from Redis:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

app.get("/api/posts/:id", async (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  try {
    const postsData = await fetchAllPostsRaw();
    const targetPost = postsData.map((item) => JSON.parse(item.toString())).find((post) => post.id === postId);

    if (!targetPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    const commentsData = await redisClient.lRange(`kuromi:posts:${postId}:comments`, 0, -1);
    const comments = commentsData.map((commentItem) => JSON.parse(commentItem.toString())).sort((a, b) => a.id - b.id);
    const viewCount = await redisClient.incr(`kuromi:posts:${postId}:views`);

    return res.json({
      id: targetPost.id,
      author: targetPost.author,
      title: targetPost.title,
      tags: normalizePostTags(targetPost.tags),
      content: targetPost.content,
      createdAt: targetPost.createdAt,
      comments,
      viewCount,
      hasImage: Boolean(targetPost.imageUrl),
      imageWidth: targetPost.imageWidth,
      imageHeight: targetPost.imageHeight,
    });
  } catch (err) {
    console.error("Failed to fetch post detail from Redis:", err);
    return res.status(500).json({ error: "Failed to fetch post detail" });
  }
});

app.post("/api/posts", async (req, res) => {
  const author = sanitizeAuthor(req.body?.author);
  const content = normalizePostContent(req.body?.content);
  const title = normalizePostTitle(req.body?.title, content);
  const tags = normalizePostTags(req.body?.tags);
  const imageUrl = String(req.body?.imageUrl ?? "");
  const imageWidth = Number(req.body?.imageWidth);
  const imageHeight = Number(req.body?.imageHeight);

  if (!author) {
    return res.status(400).json({ error: "Author is required" });
  }

  if (!ADMIN_USERS.has(author)) {
    return res.status(403).json({ error: "Only admin can publish posts" });
  }

  if (!content && !imageUrl) {
    return res.status(400).json({ error: "Post content is required" });
  }

  if (content.length > 200_000) {
    return res.status(400).json({ error: "Content is too long" });
  }

  try {
    const id = await redisClient.incr("kuromi:posts:id");
    const post = {
      id,
      author,
      title,
      tags,
      content: content || "",
      imageUrl: imageUrl || "",
      imageWidth: Number.isFinite(imageWidth) ? imageWidth : undefined,
      imageHeight: Number.isFinite(imageHeight) ? imageHeight : undefined,
      createdAt: new Date().toISOString(),
      comments: [],
    };

    await redisClient.lPush("kuromi:posts", JSON.stringify(post));
    await redisClient.set(`kuromi:posts:${id}:views`, "0");

    return res.json({ id, success: true });
  } catch (err) {
    console.error("Failed to save post to Redis:", err);
    return res.status(500).json({ error: "Failed to create post" });
  }
});

app.put("/api/posts/:id", async (req, res) => {
  const postId = Number(req.params.id);
  const author = sanitizeAuthor(req.body?.author);
  const content = normalizePostContent(req.body?.content);
  const title = normalizePostTitle(req.body?.title, content);
  const tags = normalizePostTags(req.body?.tags);

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!ADMIN_USERS.has(author)) {
    return res.status(403).json({ error: "Only admin can edit posts" });
  }

  if (!content) {
    return res.status(400).json({ error: "Post content is required" });
  }

  if (content.length > 200_000) {
    return res.status(400).json({ error: "Content is too long" });
  }

  try {
    const postsData = await fetchAllPostsRaw();
    const posts = postsData.map((item) => JSON.parse(item.toString()));
    const targetIndex = posts.findIndex((post) => post.id === postId);
    if (targetIndex === -1) {
      return res.status(404).json({ error: "Post not found" });
    }

    const target = posts[targetIndex];
    if (!ADMIN_USERS.has(String(target.author ?? ""))) {
      return res.status(403).json({ error: "Target post is not editable" });
    }

    posts[targetIndex] = {
      ...target,
      title,
      tags,
      content,
      updatedAt: new Date().toISOString(),
    };

    await redisClient.del("kuromi:posts");
    if (posts.length > 0) {
      await redisClient.rPush("kuromi:posts", posts.map((post) => JSON.stringify(post)));
    }

    return res.json({ success: true, id: postId });
  } catch (err) {
    console.error("Failed to update post:", err);
    return res.status(500).json({ error: "Failed to update post" });
  }
});

app.delete("/api/posts/:id", async (req, res) => {
  const postId = Number(req.params.id);
  const author = sanitizeAuthor(req.body?.author);

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!ADMIN_USERS.has(author)) {
    return res.status(403).json({ error: "Only admin can delete posts" });
  }

  try {
    const postsData = await fetchAllPostsRaw();
    const posts = postsData.map((item) => JSON.parse(item.toString()));
    const targetIndex = posts.findIndex((post) => post.id === postId);
    if (targetIndex === -1) {
      return res.status(404).json({ error: "Post not found" });
    }

    posts.splice(targetIndex, 1);

    await redisClient.del("kuromi:posts");
    if (posts.length > 0) {
      await redisClient.rPush("kuromi:posts", posts.map((post) => JSON.stringify(post)));
    }

    await redisClient.del(`kuromi:posts:${postId}:comments`);
    await redisClient.del(`kuromi:posts:${postId}:comments:id`);
    await redisClient.del(`kuromi:posts:${postId}:views`);

    return res.json({ success: true, id: postId });
  } catch (err) {
    console.error("Failed to delete post:", err);
    return res.status(500).json({ error: "Failed to delete post" });
  }
});

app.get("/api/posts/:id/image", async (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  try {
    const postsData = await redisClient.lRange("kuromi:posts", 0, -1);
    const target = postsData.map((item) => JSON.parse(item.toString())).find((post) => post.id === postId);

    if (!target?.imageUrl) {
      return res.status(404).json({ error: "Image not found" });
    }

    const imageUrl = String(target.imageUrl);
    res.setHeader("Cache-Control", "public, max-age=600");

    if (imageUrl.startsWith("data:")) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: "Invalid image data" });
      }

      const [, mimeType, base64] = match;
      const buffer = Buffer.from(base64, "base64");
      res.setHeader("Content-Type", mimeType || "image/jpeg");
      return res.send(buffer);
    }

    return res.redirect(imageUrl);
  } catch (err) {
    console.error("Failed to load image:", err);
    return res.status(500).json({ error: "Failed to load image" });
  }
});

app.post("/api/posts/:id/comments", async (req, res) => {
  const postId = Number(req.params.id);
  const author = normalizeNickname(req.body?.author);
  const content = normalizeMessageContent(req.body?.content);

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  if (!author) {
    return res.status(400).json({ error: "评论需要有效昵称" });
  }

  if (!content) {
    return res.status(400).json({ error: "评论内容不能为空且不能超过 300 字" });
  }

  try {
    const postsData = await redisClient.lRange("kuromi:posts", 0, -1);
    const postExists = postsData.some((item) => {
      const post = JSON.parse(item.toString());
      return post.id === postId;
    });

    if (!postExists) {
      return res.status(404).json({ error: "Post not found" });
    }

    const commentId = await redisClient.incr(`kuromi:posts:${postId}:comments:id`);
    const comment = {
      id: commentId,
      postId,
      author,
      content,
      createdAt: new Date().toISOString(),
    };

    await redisClient.rPush(`kuromi:posts:${postId}:comments`, JSON.stringify(comment));
    return res.json({ success: true, comment });
  } catch (err) {
    console.error("Failed to save comment to Redis:", err);
    return res.status(500).json({ error: "Failed to create comment" });
  }
});

async function startServer() {
  try {
    await redisClient.connect();
    console.log(`Connected to Redis at ${maskRedisUrl(REDIS_URL)}`);
  } catch (err) {
    console.error("Could not connect to Redis:", err);
    if (IS_PRODUCTION) {
      process.exit(1);
    }
  }

  if (!IS_PRODUCTION) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} (${NODE_ENV})`);
  });
}

startServer();
