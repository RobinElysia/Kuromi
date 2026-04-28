import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, MessageCircle, Send } from "lucide-react";
import { resolveApiUrl } from "../lib/api";
import type { CommentItem, Post, User } from "../types";
import MarkdownRenderer from "./MarkdownRenderer";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";

const ILLUSTRATION = new URL("../public/kuromi/16x9/kv_krm.png", import.meta.url).href;
const SIDE_IMAGE = new URL("../public/kuromi/1x1/illust_2.png", import.meta.url).href;

interface PostDetailProps {
  postId: number;
  currentUser: User;
  onBack: () => void;
  onOpenTag: (tag: string) => void;
}

function formatTime(value: string) {
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
    .slice(0, 30);
  return fallback || "无标题帖子";
}

export default function PostDetail({ postId, currentUser, onBack, onOpenTag }: PostDetailProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [commentInput, setCommentInput] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentFeedback, setCommentFeedback] = useState("");
  const activeNickname = useMemo(() => currentUser.username.trim(), [currentUser.username]);

  useEffect(() => {
    let aborted = false;

    async function loadPost() {
      setLoading(true);
      setError("");
      setCommentFeedback("");

      try {
        const res = await fetch(resolveApiUrl(`/api/posts/${postId}`));
        if (!res.ok) {
          setError("帖子不存在或已被删除");
          setPost(null);
          return;
        }

        const data = (await res.json()) as Post;
        if (!aborted) setPost(data);
      } catch (err) {
        console.error("Failed to fetch post:", err);
        if (!aborted) setError("加载失败，请稍后重试");
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    loadPost();
    return () => {
      aborted = true;
    };
  }, [postId]);

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!post) return;

    if (!activeNickname) {
      setCommentFeedback("评论必须携带昵称，请重新登录后重试");
      return;
    }

    const content = commentInput.trim();
    if (!content) {
      setCommentFeedback("评论内容不能为空");
      return;
    }

    setCommentSubmitting(true);
    setCommentFeedback("");

    try {
      const res = await fetch(resolveApiUrl(`/api/posts/${post.id}/comments`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: activeNickname, content }),
      });

      const data = (await res.json().catch(() => ({}))) as { comment?: CommentItem; error?: string };
      if (!res.ok || !data.comment) {
        setCommentFeedback(data.error || "评论发送失败");
        return;
      }

      setPost((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: [...(prev.comments ?? []), data.comment as CommentItem],
        };
      });
      setCommentInput("");
      setCommentFeedback("评论发布成功");
    } catch (err) {
      console.error("Failed to submit comment:", err);
      setCommentFeedback("评论发送失败，请稍后再试");
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-7xl items-center justify-center p-6">
        <Card className="px-8 py-6 text-slate-100">正在加载帖子详情...</Card>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto min-h-[60vh] w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <Card className="mx-auto max-w-2xl p-6 text-center sm:p-8">
          <p className="text-rose-200">{error || "帖子不存在"}</p>
          <Button type="button" onClick={onBack} variant="cyan" className="mt-5">
            返回 Post
          </Button>
        </Card>
      </div>
    );
  }

  const tags = post.tags ?? [];
  const comments = post.comments ?? [];
  const viewCount = post.viewCount ?? 0;

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="space-y-5">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative grid min-h-[240px] gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="relative p-6 sm:p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(251,113,133,0.14),rgba(2,6,23,0)_42%),radial-gradient(circle_at_82%_76%,rgba(34,211,238,0.16),rgba(2,6,23,0)_45%)]" />
                <div className="relative z-10 flex h-full flex-col justify-between gap-5">
                  <div className="space-y-3">
                    <Badge variant="muted" className="w-fit text-[11px] tracking-[0.2em]">
                      POST DETAIL
                    </Badge>
                    <CardTitle className="break-words bg-gradient-to-r from-rose-100 via-orange-100 to-cyan-100 bg-clip-text text-2xl leading-tight text-transparent sm:text-3xl">
                      {resolvePostTitle(post)}
                    </CardTitle>
                    <p className="max-w-3xl text-sm leading-6 text-slate-200/85">本站仅 RobinElysia 与 Meow 可注册管理员账号，凭证写入 Redis；访客模式填写昵称后仍可浏览、留言与评论。</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="rose">作者：{post.author}</Badge>
                    <Badge variant="muted">发布时间：{formatTime(post.createdAt)}</Badge>
                    <Badge variant="muted" className="inline-flex items-center gap-1.5">
                      <Eye size={12} /> 阅读：{viewCount}
                    </Badge>
                    <Badge variant="muted">当前用户：{activeNickname || "未命名访客"}</Badge>
                  </div>
                </div>
              </div>

              <div className="relative hidden overflow-hidden border-l border-slate-100/15 lg:block">
                <img src={ILLUSTRATION} alt="" aria-hidden="true" className="h-full w-full object-cover object-center opacity-90" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/72 via-slate-900/20 to-transparent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-5">
            <Card className="min-w-0">
              <CardHeader className="border-b border-slate-100/10 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs tracking-[0.2em] text-cyan-100/80">ARTICLE</p>
                  <Button type="button" onClick={onBack} variant="cyan">
                    返回 Post
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="min-w-0 p-4 sm:p-6 lg:p-8">
                <MarkdownRenderer content={post.content || ""} className="post-detail-markdown w-full min-w-0 max-w-none text-slate-100" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-2 text-sm tracking-[0.12em] text-slate-100">
                    <MessageCircle size={15} className="text-cyan-100" />
                    COMMENTS
                  </p>
                  <Badge variant="muted">{comments.length} 条评论</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSubmitComment} className="space-y-2">
                  <Textarea
                    value={commentInput}
                    onChange={(event) => setCommentInput(event.target.value)}
                    placeholder="写下你的评论..."
                    aria-label="评论输入框"
                    maxLength={1000}
                    disabled={commentSubmitting || !activeNickname}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-300/75">{activeNickname ? `昵称：${activeNickname}` : "需要昵称才可评论"}</p>
                    <Button type="submit" size="sm" variant="cyan" disabled={commentSubmitting || !activeNickname}>
                      <Send size={13} className="mr-1.5" />
                      {commentSubmitting ? "发送中..." : "发送评论"}
                    </Button>
                  </div>
                </form>

                {commentFeedback && <p className="text-xs text-cyan-100/90">{commentFeedback}</p>}

                <div className="space-y-2">
                  {comments.length === 0 && <p className="text-sm text-slate-300/75">还没有评论，来发布第一条吧。</p>}
                  {comments.map((comment, index) => (
                    <motion.article
                      key={comment.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.015 }}
                      className="rounded-2xl border border-slate-200/15 bg-slate-900/55 p-3"
                    >
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-cyan-100">{comment.author}</p>
                        <p className="text-[11px] text-slate-300/75">{formatTime(comment.createdAt)}</p>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-100/90">{comment.content}</p>
                    </motion.article>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardHeader className="pb-3">
                  <p className="text-xs tracking-[0.2em] text-slate-200/80">POST META</p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-100/92">
                  <div className="rounded-2xl border border-slate-200/15 bg-slate-900/55 p-3">
                    <p className="text-xs text-slate-300/75">帖子 ID</p>
                    <p className="mt-1 font-medium text-cyan-100">{post.id}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/15 bg-slate-900/55 p-3">
                    <p className="text-xs text-slate-300/75">作者</p>
                    <p className="mt-1 font-medium">{post.author}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/15 bg-slate-900/55 p-3">
                    <p className="text-xs text-slate-300/75">阅读次数</p>
                    <p className="mt-1 font-medium">{viewCount}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <Card>
              <CardHeader className="pb-3">
                <p className="text-xs tracking-[0.2em] text-slate-200/80">TAGS</p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button key={tag} type="button" onClick={() => onOpenTag(tag)} className="rounded-full transition hover:-translate-y-0.5">
                    <Badge>#{tag}</Badge>
                  </button>
                ))}
                {tags.length === 0 && <Badge variant="muted">#未分类</Badge>}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <img src={SIDE_IMAGE} alt="" aria-hidden="true" className="h-44 w-full object-cover object-top sm:h-52 lg:h-44" loading="lazy" />
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

