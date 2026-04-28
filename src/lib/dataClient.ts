import type { CommentItem, MessageItem, Post } from "../types";
import { resolveApiUrl, resolveAssetUrl } from "./api";
import { ADMIN_CREDENTIALS, ADMIN_USERNAMES, KUROMI_DATA_MODE, RESERVED_NICKNAMES } from "./runtimeConfig";

interface BrowserDbShape {
  posts: Post[];
  messages: MessageItem[];
  guestNicknames: string[];
  counters: {
    postId: number;
    messageId: number;
  };
}

interface LoginResult {
  success?: boolean;
  message?: string;
  user?: string;
  role?: "admin" | "guest";
}

const DB_NAME = "kuromi-secret-base";
const STORE_NAME = "kv";
const DB_VERSION = 1;
const ROOT_KEY = "browser-db";
const LEGACY_STORAGE_KEY = "kuromi_browser_db_v1";
const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

let indexedDbPromise: Promise<IDBDatabase | null> | null = null;
let browserApiShimInstalled = false;

function isBrowserStorageMode() {
  return KUROMI_DATA_MODE === "browser";
}

function createDefaultDb(): BrowserDbShape {
  return {
    posts: [],
    messages: [],
    guestNicknames: [],
    counters: {
      postId: 0,
      messageId: 0,
    },
  };
}

function jsonResponse<T>(data: T, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clonePost(post: Post): Post {
  return {
    ...post,
    tags: [...(post.tags ?? [])],
    comments: [...(post.comments ?? [])],
  };
}

function sanitizeAuthor(rawAuthor: unknown): string {
  return String(rawAuthor ?? "").trim();
}

function normalizePostContent(rawContent: unknown): string {
  return String(rawContent ?? "").replace(/\r\n/g, "\n").trim();
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

function normalizePostTitle(rawTitle: unknown, rawContent: unknown): string {
  const title = String(rawTitle ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (title) return title.slice(0, 120);

  const fallback = String(rawContent ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

  return fallback || "未命名帖子";
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
  if (ADMIN_USERNAMES.has(value) || RESERVED_NICKNAMES.has(lowered)) {
    return "";
  }

  return value;
}

function normalizeMessageContent(rawValue: unknown): string {
  const value = String(rawValue ?? "").replace(/\r\n/g, "\n").trim();
  if (!value) return "";
  if (value.length > 300) return "";
  return value;
}

function nextCommentId(post: Post): number {
  return (post.comments ?? []).reduce((maxId, comment) => Math.max(maxId, comment.id), 0) + 1;
}

function parseJsonBody(init?: RequestInit) {
  if (!init?.body || typeof init.body !== "string") return {};

  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readLegacyDb(): BrowserDbShape | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BrowserDbShape>;
    return {
      posts: Array.isArray(parsed.posts) ? (parsed.posts as Post[]) : [],
      messages: Array.isArray(parsed.messages) ? (parsed.messages as MessageItem[]) : [],
      guestNicknames: Array.isArray(parsed.guestNicknames) ? (parsed.guestNicknames as string[]) : [],
      counters: {
        postId: Number(parsed.counters?.postId ?? 0),
        messageId: Number(parsed.counters?.messageId ?? 0),
      },
    };
  } catch {
    return null;
  }
}

function getIndexedDb() {
  if (typeof window === "undefined" || typeof window.indexedDB === "undefined") {
    return Promise.resolve(null);
  }

  if (!indexedDbPromise) {
    indexedDbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
    });
  }

  return indexedDbPromise;
}

async function readBrowserDb(): Promise<BrowserDbShape> {
  const db = await getIndexedDb().catch(() => null);
  if (!db) {
    return readLegacyDb() ?? createDefaultDb();
  }

  const stored = await new Promise<BrowserDbShape | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(ROOT_KEY);
    request.onsuccess = () => resolve((request.result as BrowserDbShape | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to read browser db"));
  }).catch(() => null);

  if (stored) {
    return {
      posts: Array.isArray(stored.posts) ? stored.posts : [],
      messages: Array.isArray(stored.messages) ? stored.messages : [],
      guestNicknames: Array.isArray(stored.guestNicknames) ? stored.guestNicknames : [],
      counters: {
        postId: Number(stored.counters?.postId ?? 0),
        messageId: Number(stored.counters?.messageId ?? 0),
      },
    };
  }

  const migrated = readLegacyDb();
  if (migrated) {
    await writeBrowserDb(migrated);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return migrated;
  }

  return createDefaultDb();
}

async function writeBrowserDb(next: BrowserDbShape) {
  const db = await getIndexedDb().catch(() => null);
  if (!db) {
    window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(next));
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(next, ROOT_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to write browser db"));
    tx.onabort = () => reject(tx.error ?? new Error("Failed to write browser db"));
  });
}

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        reject(new Error("图片上传失败"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("图片上传失败"));
    reader.readAsDataURL(file);
  });
}

async function requestJson(path: string, init?: RequestInit) {
  return fetch(resolveApiUrl(path), init);
}

export async function loginAdmin(username: string, password: string): Promise<LoginResult> {
  const normalizedUsername = username.trim();

  if (!isBrowserStorageMode()) {
    const response = await requestJson("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: normalizedUsername, password }),
    });
    return response.json().catch(() => ({}));
  }

  const credential = ADMIN_CREDENTIALS.find((item) => item.username === normalizedUsername);
  if (!credential || !password) {
    return { success: false, message: "账号或密码错误" };
  }

  const incomingHash = await sha256Hex(password);
  if (incomingHash !== credential.passwordHash) {
    return { success: false, message: "账号或密码错误" };
  }

  return { success: true, user: normalizedUsername, role: "admin" };
}

export async function loginGuest(nickname: string): Promise<LoginResult> {
  if (!isBrowserStorageMode()) {
    const response = await requestJson("/api/guest-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    return response.json().catch(() => ({}));
  }

  const normalized = normalizeGuestNickname(nickname);
  if (!normalized) {
    return {
      success: false,
      message: "昵称需 2-24 字符，仅允许中文、字母、数字、空格、_、-、.、·",
    };
  }

  const db = await readBrowserDb();
  if (!db.guestNicknames.includes(normalized)) {
    db.guestNicknames.push(normalized);
    await writeBrowserDb(db);
  }

  return { success: true, user: normalized, role: "guest" };
}

export async function getMessages(limit = 20): Promise<MessageItem[]> {
  if (!isBrowserStorageMode()) {
    const response = await requestJson(`/api/messages?limit=${limit}`);
    if (!response.ok) throw new Error("Failed to fetch messages");
    return response.json();
  }

  const db = await readBrowserDb();
  return db.messages.slice(0, Math.max(1, Math.min(limit, 60)));
}

export async function createMessage(author: string, content: string): Promise<MessageItem> {
  if (!isBrowserStorageMode()) {
    const response = await requestJson("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, content }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; message?: MessageItem };
    if (!response.ok || !data.message) {
      throw new Error(data.error || "留言提交失败");
    }
    return data.message;
  }

  const normalizedAuthor = normalizeNickname(author);
  const normalizedContent = normalizeMessageContent(content);

  if (!normalizedAuthor) {
    throw new Error("留言需要有效昵称");
  }
  if (!normalizedContent) {
    throw new Error("留言内容不能为空且不能超过 300 字");
  }

  const db = await readBrowserDb();
  db.counters.messageId += 1;
  const message: MessageItem = {
    id: db.counters.messageId,
    author: normalizedAuthor,
    content: normalizedContent,
    createdAt: new Date().toISOString(),
  };

  db.messages.unshift(message);
  db.messages = db.messages.slice(0, 200);
  await writeBrowserDb(db);
  return message;
}

export async function getPosts(limit = 10): Promise<Post[]> {
  if (!isBrowserStorageMode()) {
    const response = await requestJson(`/api/posts?limit=${limit}`);
    if (!response.ok) throw new Error("Failed to fetch posts");
    return response.json();
  }

  const db = await readBrowserDb();
  return db.posts.slice(0, Math.max(1, Math.min(limit, 30))).map((post) => clonePost(post));
}

export async function getPostDetail(postId: number): Promise<Post> {
  if (!isBrowserStorageMode()) {
    const response = await requestJson(`/api/posts/${postId}`);
    const data = (await response.json().catch(() => ({}))) as Post & { error?: string };
    if (!response.ok) throw new Error(data.error || "Post not found");
    return data;
  }

  const db = await readBrowserDb();
  const target = db.posts.find((post) => post.id === postId);
  if (!target) {
    throw new Error("Post not found");
  }

  target.viewCount = (target.viewCount ?? 0) + 1;
  await writeBrowserDb(db);
  return clonePost(target);
}

export async function createPost(input: { author: string; title: string; tags: string[]; content: string }) {
  if (!isBrowserStorageMode()) {
    const response = await requestJson("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; id?: number };
    if (!response.ok || !data.id) {
      throw new Error(data.error || "发布失败");
    }
    return data.id;
  }

  const author = sanitizeAuthor(input.author);
  const content = normalizePostContent(input.content);
  const title = normalizePostTitle(input.title, content);
  const tags = normalizePostTags(input.tags);

  if (!author) throw new Error("Author is required");
  if (!ADMIN_USERNAMES.has(author)) throw new Error("Only admin can publish posts");
  if (!content) throw new Error("Post content is required");
  if (content.length > 200_000) throw new Error("Content is too long");

  const db = await readBrowserDb();
  db.counters.postId += 1;

  const post: Post = {
    id: db.counters.postId,
    author,
    title,
    tags,
    content,
    createdAt: new Date().toISOString(),
    comments: [],
    viewCount: 0,
  };

  db.posts.unshift(post);
  await writeBrowserDb(db);
  return post.id;
}

export async function updatePost(postId: number, input: { author: string; title: string; tags: string[]; content: string }) {
  if (!isBrowserStorageMode()) {
    const response = await requestJson(`/api/posts/${postId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error || "更新失败");
    }
    return;
  }

  const author = sanitizeAuthor(input.author);
  const content = normalizePostContent(input.content);
  const title = normalizePostTitle(input.title, content);
  const tags = normalizePostTags(input.tags);

  if (!Number.isInteger(postId) || postId <= 0) throw new Error("Invalid post id");
  if (!ADMIN_USERNAMES.has(author)) throw new Error("Only admin can edit posts");
  if (!content) throw new Error("Post content is required");
  if (content.length > 200_000) throw new Error("Content is too long");

  const db = await readBrowserDb();
  const target = db.posts.find((post) => post.id === postId);
  if (!target) throw new Error("Post not found");

  target.title = title;
  target.tags = tags;
  target.content = content;
  await writeBrowserDb(db);
}

export async function deletePost(postId: number, author: string) {
  if (!isBrowserStorageMode()) {
    const response = await requestJson(`/api/posts/${postId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error || "删除失败");
    }
    return;
  }

  const normalizedAuthor = sanitizeAuthor(author);
  if (!Number.isInteger(postId) || postId <= 0) throw new Error("Invalid post id");
  if (!ADMIN_USERNAMES.has(normalizedAuthor)) throw new Error("Only admin can delete posts");

  const db = await readBrowserDb();
  const targetIndex = db.posts.findIndex((post) => post.id === postId);
  if (targetIndex === -1) throw new Error("Post not found");

  db.posts.splice(targetIndex, 1);
  await writeBrowserDb(db);
}

export async function createComment(postId: number, author: string, content: string): Promise<CommentItem> {
  if (!isBrowserStorageMode()) {
    const response = await requestJson(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, content }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; comment?: CommentItem };
    if (!response.ok || !data.comment) {
      throw new Error(data.error || "评论发送失败");
    }
    return data.comment;
  }

  const normalizedAuthor = normalizeNickname(author);
  const normalizedContent = normalizeMessageContent(content);

  if (!Number.isInteger(postId) || postId <= 0) throw new Error("Invalid post id");
  if (!normalizedAuthor) throw new Error("评论需要有效昵称");
  if (!normalizedContent) throw new Error("评论内容不能为空且不能超过 300 字");

  const db = await readBrowserDb();
  const post = db.posts.find((item) => item.id === postId);
  if (!post) throw new Error("Post not found");

  const comment: CommentItem = {
    id: nextCommentId(post),
    postId,
    author: normalizedAuthor,
    content: normalizedContent,
    createdAt: new Date().toISOString(),
  };

  post.comments = [...(post.comments ?? []), comment];
  await writeBrowserDb(db);
  return comment;
}

export async function uploadEditorImage(file: File, uploader: string) {
  const normalizedUploader = sanitizeAuthor(uploader);

  if (!isBrowserStorageMode()) {
    const payload = new FormData();
    payload.append("image", file);

    const response = await fetch(resolveApiUrl("/api/uploads/images"), {
      method: "POST",
      headers: { "x-kuromi-user": normalizedUploader },
      body: payload,
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string; url?: string; name?: string };
    if (!response.ok || !data.url) {
      throw new Error(data.error || "图片上传失败");
    }

    return { url: resolveAssetUrl(data.url), alt: file.name, title: data.name || file.name };
  }

  if (!ADMIN_USERNAMES.has(normalizedUploader)) {
    throw new Error("仅管理员可上传图片");
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("仅支持 JPG、PNG、WEBP、GIF、AVIF");
  }
  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error("图片过大，单张请控制在 8MB 内");
  }

  const url = await readFileAsDataUrl(file);
  return { url, alt: file.name, title: file.name };
}

function buildErrorResponse(message: string, status = 500) {
  return jsonResponse({ error: message, message }, status);
}

export async function handleBrowserApiRequest(input: RequestInfo | URL, init?: RequestInit) {
  const target = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const url = new URL(target, window.location.origin);
  const method = String(init?.method ?? "GET").toUpperCase();
  const pathname = url.pathname;
  const body = parseJsonBody(init);

  try {
    if (pathname === "/api/login" && method === "POST") {
      return jsonResponse(await loginAdmin(String(body.username ?? ""), String(body.password ?? "")));
    }

    if (pathname === "/api/guest-login" && method === "POST") {
      return jsonResponse(await loginGuest(String(body.nickname ?? "")));
    }

    if (pathname === "/api/messages" && method === "GET") {
      return jsonResponse(await getMessages(Number(url.searchParams.get("limit") ?? 20)));
    }

    if (pathname === "/api/messages" && method === "POST") {
      return jsonResponse({ success: true, message: await createMessage(String(body.author ?? ""), String(body.content ?? "")) });
    }

    if (pathname === "/api/posts" && method === "GET") {
      return jsonResponse(await getPosts(Number(url.searchParams.get("limit") ?? 10)));
    }

    if (pathname === "/api/posts" && method === "POST") {
      const id = await createPost({
        author: String(body.author ?? ""),
        title: String(body.title ?? ""),
        tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
        content: String(body.content ?? ""),
      });
      return jsonResponse({ success: true, id });
    }

    if (pathname === "/api/uploads/images" && method === "POST") {
      const formData = init?.body instanceof FormData ? init.body : null;
      const file = formData?.get("image");
      const uploader = new Headers(init?.headers).get("x-kuromi-user") ?? "";
      if (!(file instanceof File)) {
        return buildErrorResponse("未检测到图片文件", 400);
      }
      const uploaded = await uploadEditorImage(file, uploader);
      return jsonResponse({ success: true, url: uploaded.url, name: uploaded.title });
    }

    const postMatch = pathname.match(/^\/api\/posts\/(\d+)$/);
    if (postMatch && method === "GET") {
      return jsonResponse(await getPostDetail(Number(postMatch[1])));
    }
    if (postMatch && method === "PUT") {
      const postId = Number(postMatch[1]);
      await updatePost(postId, {
        author: String(body.author ?? ""),
        title: String(body.title ?? ""),
        tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
        content: String(body.content ?? ""),
      });
      return jsonResponse({ success: true, id: postId });
    }
    if (postMatch && method === "DELETE") {
      const postId = Number(postMatch[1]);
      await deletePost(postId, String(body.author ?? ""));
      return jsonResponse({ success: true, id: postId });
    }

    const commentMatch = pathname.match(/^\/api\/posts\/(\d+)\/comments$/);
    if (commentMatch && method === "POST") {
      const comment = await createComment(Number(commentMatch[1]), String(body.author ?? ""), String(body.content ?? ""));
      return jsonResponse({ success: true, comment });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const lower = message.toLowerCase();
    const status =
      lower.includes("not found") ? 404 :
      lower.includes("only admin") || lower.includes("仅管理员") ? 403 :
      lower.includes("invalid") || lower.includes("不能为空") || lower.includes("不超过") || lower.includes("支持") || lower.includes("过大") ? 400 :
      500;
    return buildErrorResponse(message, status);
  }

  return buildErrorResponse("Not found", 404);
}

export function installBrowserApiShim() {
  if (!isBrowserStorageMode() || browserApiShimInstalled || typeof window === "undefined") {
    return;
  }

  const nativeFetch = window.fetch.bind(window);
  browserApiShimInstalled = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const target = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(target, window.location.origin);

    if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
      return handleBrowserApiRequest(url, init);
    }

    return nativeFetch(input, init);
  };
}
