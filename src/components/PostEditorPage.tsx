import React, { useEffect, useMemo, useState } from "react";
import { Editor } from "@bytemd/react";
import { resolveApiUrl, resolveAssetUrl } from "../lib/api";
import type { Post, User } from "../types";
import { createMarkdownSanitizer, markdownPlugins } from "../lib/markdown";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";

interface PostEditorPageProps {
  currentUser: User;
  search: string;
  onOpenPost: (id: number) => void;
}

function extractPostTitle(post: Post) {
  const title = post.title?.trim();
  if (title) return title;
  const fallback = (post.content ?? "").replace(/\s+/g, " ").trim().slice(0, 30);
  return fallback || "未命名帖子";
}

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

function normalizeMarkdown(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function formatUnsupportedImageMessage() {
  return "仅支持 JPG、PNG、WEBP、GIF、AVIF，且单图不超过 8MB";
}

async function uploadImageFile(file: File, uploader: string): Promise<{ url: string; alt: string; title: string }> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(formatUnsupportedImageMessage());
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("图片过大，单张请控制在 8MB 内");
  }

  const payload = new FormData();
  payload.append("image", file);

  const response = await fetch(resolveApiUrl("/api/uploads/images"), {
    method: "POST",
    headers: { "x-kuromi-user": uploader },
    body: payload,
  });

  const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !data.url) {
    throw new Error(data.error || "图片上传失败");
  }

  return {
    url: resolveAssetUrl(data.url),
    alt: file.name,
    title: file.name,
  };
}

export default function PostEditorPage({ currentUser, search, onOpenPost }: PostEditorPageProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isAdmin = currentUser.role === "admin";

  const fetchPosts = async () => {
    try {
      const res = await fetch(resolveApiUrl("/api/posts?limit=30"));
      if (!res.ok) return;
      const data = (await res.json()) as Post[];
      setPosts(data);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return posts;

    return posts.filter((post) => {
      const summary = `${extractPostTitle(post)} ${post.author} ${post.content} ${(post.tags ?? []).join(" ")}`.toLowerCase();
      return summary.includes(keyword);
    });
  }, [posts, search]);

  const handleSelectPost = (post: Post) => {
    setSelectedId(post.id);
    setTitle(extractPostTitle(post));
    setTags(post.tags ?? []);
    setTagInput("");
    setContent(post.content ?? "");
    setMessage("");
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setTitle("");
    setTags([]);
    setTagInput("");
    setContent("");
    setMessage("已切换为新帖子草稿");
  };

  const addTag = (rawTag: string) => {
    const cleaned = rawTag.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!cleaned) return;

    setTags((prev) => {
      if (prev.some((tag) => tag.toLowerCase() === cleaned.toLowerCase())) return prev;
      if (prev.length >= 12) return prev;
      return [...prev, cleaned];
    });
  };

  const removeTag = (targetTag: string) => {
    setTags((prev) => prev.filter((tag) => tag !== targetTag));
  };

  const handleImportMarkdown = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = normalizeMarkdown(await file.text());
      setContent(text);

      if (!title.trim()) {
        const firstLine = text
          .split(/\r?\n/)
          .map((line) => line.replace(/^#+\s*/, "").trim())
          .find(Boolean);

        if (firstLine) setTitle(firstLine.slice(0, 120));
      }

      setMessage(`已导入 ${file.name}`);
    } catch (err) {
      console.error("Failed to import markdown:", err);
      setMessage("导入失败，请重试");
    } finally {
      event.target.value = "";
    }
  };

  const handleInsertImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      const uploaded: { url: string; alt: string }[] = [];
      for (const file of files) {
        const item = await uploadImageFile(file, currentUser.username);
        uploaded.push({ url: item.url, alt: item.alt });
      }
      const markdownImage = uploaded.map((item) => `\n![${item.alt}](${item.url})\n`).join("");
      setContent((prev) => `${prev}${markdownImage}`);
      setMessage(`已上传并插入 ${uploaded.length} 张图片`);
    } catch (err) {
      console.error("Failed to insert image:", err);
      setMessage(err instanceof Error ? err.message : "图片插入失败");
    } finally {
      event.target.value = "";
    }
  };

  const handlePublish = async () => {
    if (!isAdmin) {
      setMessage("访客模式无发布权限");
      return;
    }

    const trimmedContent = normalizeMarkdown(content).trim();
    const trimmedTitle = title.trim();
    if (!trimmedContent) {
      setMessage("正文不能为空");
      return;
    }

    setLoading(true);
    try {
      const endpoint = selectedId ? `/api/posts/${selectedId}` : "/api/posts";
      const method = selectedId ? "PUT" : "POST";

      const res = await fetch(resolveApiUrl(endpoint), {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: currentUser.username,
          title: trimmedTitle,
          tags,
          content: trimmedContent,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "发布失败");
        return;
      }

      const data = (await res.json()) as { id?: number };
      const postId = selectedId ?? data.id ?? null;
      if (postId) setSelectedId(postId);
      await fetchPosts();
      setMessage(selectedId ? "更新成功" : "发布成功");
    } catch (err) {
      console.error("Failed to publish post:", err);
      setMessage("发布失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) {
      setMessage("访客模式无删除权限");
      return;
    }

    if (!selectedId) {
      setMessage("请先选择要删除的帖子");
      return;
    }

    if (!window.confirm("确认删除当前帖子？删除后不可恢复。")) return;

    setLoading(true);
    try {
      const res = await fetch(resolveApiUrl(`/api/posts/${selectedId}`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: currentUser.username }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "删除失败");
        return;
      }

      await fetchPosts();
      handleCreateNew();
      setMessage("帖子已删除");
    } catch (err) {
      console.error("Failed to delete post:", err);
      setMessage("删除失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-[1650px] gap-5 p-4 sm:p-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="p-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm tracking-[0.08em] text-slate-100/90">POST DRAFTS</CardTitle>
            <Button type="button" size="sm" variant="cyan" onClick={handleCreateNew}>
              新建
            </Button>
          </div>
        </CardHeader>
        <CardContent className="max-h-[calc(100vh-11rem)] space-y-2 overflow-auto">
          {filteredPosts.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => handleSelectPost(post)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                selectedId === post.id
                  ? "border-cyan-200/45 bg-cyan-200/12 text-slate-50"
                  : "border-slate-200/15 bg-slate-900/60 text-slate-200/80 hover:border-slate-200/30"
              }`}
            >
              <p className="truncate font-medium">{extractPostTitle(post)}</p>
              <p className="mt-1 text-[11px] text-slate-300/70">{post.author}</p>
            </button>
          ))}
          {filteredPosts.length === 0 && <p className="text-xs text-slate-300/70">暂无匹配帖子。</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入帖子标题"
              aria-label="帖子标题"
              className="min-w-[220px] flex-1"
            />
            <label className="inline-flex cursor-pointer items-center">
              <span className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg border border-slate-100/20 bg-slate-900/55 px-3 text-xs font-medium text-slate-100 transition hover:bg-slate-800/65">
                导入 .md
              </span>
              <input type="file" accept=".md,text/markdown" className="hidden" onChange={handleImportMarkdown} />
            </label>
            <label className="inline-flex cursor-pointer items-center">
              <span className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg border border-slate-100/20 bg-slate-900/55 px-3 text-xs font-medium text-slate-100 transition hover:bg-slate-800/65">
                插入图片
              </span>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="hidden" multiple onChange={handleInsertImage} />
            </label>
            <Button type="button" onClick={handlePublish} disabled={loading}>
              {selectedId ? "更新发布" : "发布帖子"}
            </Button>
            <Button type="button" variant="rose" onClick={handleDelete} disabled={loading || !selectedId}>
              删除
            </Button>
            <Button type="button" variant="cyan" onClick={() => selectedId && onOpenPost(selectedId)} disabled={!selectedId}>
              查看详情
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200/15 bg-slate-900/55 p-3">
            <p className="mb-2 text-xs tracking-[0.14em] text-slate-300/80">TAGS</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} className="gap-1">
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`删除trails ${tag}`}
                    className="rounded-full px-1 text-cyan-50/85 hover:bg-cyan-200/20"
                  >
                    x
                  </button>
                </Badge>
              ))}
              {tags.length === 0 && <span className="text-xs text-slate-300/70">暂无trails</span>}
            </div>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                  setTagInput("");
                }
                if (e.key === "Backspace" && !tagInput) {
                  setTags((prev) => prev.slice(0, -1));
                }
              }}
              onBlur={() => {
                if (!tagInput.trim()) return;
                addTag(tagInput);
                setTagInput("");
              }}
              placeholder="输入trails后按 Enter，例如：Diary"
              aria-label="帖子trails输入"
              className="h-9"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200/15 bg-slate-900/75">
            <Editor
              value={content}
              plugins={markdownPlugins}
              sanitize={createMarkdownSanitizer}
              mode="split"
              placeholder="在这里编写 Markdown 内容，支持 LaTeX 与 Mermaid（```mermaid）。"
              uploadImages={async (files) => {
                const uploaded: { url: string; alt: string; title: string }[] = [];
                for (const file of files) {
                  const item = await uploadImageFile(file, currentUser.username);
                  uploaded.push(item);
                }
                setMessage(`已上传并插入 ${uploaded.length} 张图片`);
                return uploaded;
              }}
              onChange={(nextValue) => {
                setContent(nextValue);
              }}
            />
          </div>
          <p className="text-xs text-slate-300/75">
            项目说明：本站仅 RobinElysia 与 Meow 可注册管理员并拥有发帖管理权限；访客模式可浏览与评论。
          </p>
          <p className="text-xs text-cyan-100/85">图片采用文件上传 URL 引用，不再写入 Base64，支持多图连续插入。</p>
          {message && <p className="text-xs text-orange-100">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

