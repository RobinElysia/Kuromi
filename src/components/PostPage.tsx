import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Sparkles } from "lucide-react";
import { resolveApiUrl } from "../lib/api";
import type { Post, User } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface PostPageProps {
  user: User;
  search: string;
  onOpenPost: (postId: number) => void;
  onOpenTag: (tag: string) => void;
}

const POST_BANNER = new URL("../public/kuromi/16x9/bg_about.png", import.meta.url).href;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function resolvePostTitle(post: Post) {
  const title = post.title?.trim();
  const normalizedTitle = title
    ?.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (normalizedTitle) return normalizedTitle;

  const fallback = post.content
    ?.replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
  return fallback || "无标题帖子";
}

function toExcerpt(content: string, maxLength = 200) {
  const plain = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[>*_~|-]/g, " ")
    .replace(/\$\$?[\s\S]*?\$\$?/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return "（暂无正文预览）";
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength)}...`;
}

export default function PostPage({ user, search, onOpenPost, onOpenTag }: PostPageProps) {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    let aborted = false;

    async function loadPosts() {
      try {
        const res = await fetch(resolveApiUrl("/api/posts?limit=20"));
        if (!res.ok || aborted) return;
        const data = (await res.json()) as Post[];
        if (!aborted) setPosts(data);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      }
    }

    loadPosts();
    return () => {
      aborted = true;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return posts;

    return posts.filter((post) => {
      const combined = `${resolvePostTitle(post)} ${post.author} ${post.content} ${(post.tags ?? []).join(" ")}`.toLowerCase();
      return combined.includes(keyword);
    });
  }, [posts, search]);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <main className="mx-auto relative w-full max-w-[1550px] pl-6 sm:pl-12">
        <div className="pointer-events-none absolute bottom-0 left-2 top-0 w-[2px] rounded-full bg-gradient-to-b from-rose-300/80 via-cyan-200/65 to-cyan-300/35 shadow-[0_0_24px_rgba(34,211,238,0.35)] sm:left-4" />

        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-100/15">
          <img src={POST_BANNER} alt="" aria-hidden="true" className="h-24 w-full object-cover object-center opacity-75 sm:h-28" loading="lazy" decoding="async" />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="muted" className="border-slate-100/25">POST ZONE</Badge>
          <Badge className="border-cyan-200/35 bg-cyan-200/12 text-cyan-100">当前用户: {user.username}</Badge>
        </div>

        <div className="space-y-5">
          {filteredPosts.map((post, index) => (
            <motion.article key={post.id} className="relative" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.02 }}>
              <div className="absolute left-2 top-7 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-white/60 bg-slate-50 shadow-[0_0_16px_rgba(255,255,255,0.7)] sm:left-4" />
              <Card className="overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-rose-300/85 via-orange-300/75 to-cyan-300/85" />
                <CardContent className="p-6">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-300 to-cyan-200 font-bold text-slate-900">
                        {post.author.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg text-slate-50">{resolvePostTitle(post)}</h3>
                        <p className="text-xs text-slate-300/70">
                          {post.author} · {formatDateTime(post.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Button type="button" variant="cyan" size="sm" onClick={() => onOpenPost(post.id)}>
                      <FileText size={14} className="mr-1.5" /> 查看详情
                    </Button>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2">
                    {(post.tags ?? []).map((tag) => (
                      <button
                        key={`${post.id}-${tag}`}
                        type="button"
                        onClick={() => onOpenTag(tag)}
                        className="rounded-full transition hover:-translate-y-0.5"
                        aria-label={`查看trails ${tag}`}
                      >
                        <Badge>#{tag}</Badge>
                      </button>
                    ))}
                    {(post.tags ?? []).length === 0 && <Badge variant="muted">#未分类</Badge>}
                  </div>

                  <p
                    className="overflow-hidden text-sm leading-7 text-slate-200/90"
                    style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}
                  >
                    {toExcerpt(post.content)}
                  </p>
                </CardContent>
              </Card>
            </motion.article>
          ))}

          {filteredPosts.length === 0 && (
            <Card className="py-14 text-center text-slate-200/75">
              <p className="mb-2 inline-flex items-center gap-2 text-base text-slate-100">
                <Sparkles size={16} className="text-cyan-200" /> 没有匹配的帖子
              </p>
              <p className="text-sm text-slate-300/75">可以尝试更换关键词，或切换到其他页面。</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
