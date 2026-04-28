import React, { useEffect, useState } from "react";
import { MessageCircleHeart, SendHorizontal } from "lucide-react";
import { resolveApiUrl } from "../lib/api";
import type { MessageItem, User } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

interface GuestMessageBoardProps {
  currentUser: User;
  latestMessage: MessageItem | null;
  messageCount: number;
  onMessageCreated: (message: MessageItem) => void;
}

export default function GuestMessageBoard({ currentUser, latestMessage, messageCount, onMessageCreated }: GuestMessageBoardProps) {
  const [nickname, setNickname] = useState(currentUser.username);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setNickname(currentUser.username);
  }, [currentUser.username]);

  const trimmedNickname = nickname.trim();
  const trimmedContent = content.trim();
  const canAccess = trimmedNickname.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canAccess) {
      setFeedback("请先设置昵称后再留言");
      return;
    }

    if (!trimmedContent) {
      setFeedback("留言内容不能为空");
      return;
    }

    setSubmitting(true);
    setFeedback("");

    try {
      const res = await fetch(resolveApiUrl("/api/messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: trimmedNickname, content: trimmedContent }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: MessageItem };
      if (!res.ok || !data.message) {
        setFeedback(data.error || "留言提交失败");
        return;
      }

      setContent("");
      onMessageCreated(data.message);
    } catch (err) {
      console.error("Failed to submit message:", err);
      setFeedback("留言提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-slate-100/18 bg-[linear-gradient(160deg,rgba(2,6,23,0.9),rgba(17,24,39,0.86)_52%,rgba(88,28,135,0.2))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_42%)]" />

      <CardHeader className="relative space-y-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-sm text-slate-50">
              <MessageCircleHeart size={16} className="text-cyan-100" />
              Guest Broadcast Panel
            </p>
          </div>
          <Badge variant="muted">{messageCount} / 24</Badge>
        </div>
      </CardHeader>

      <CardContent className="relative grid gap-4">
        <div className="rounded-[28px] border border-slate-100/14 bg-slate-900/42 p-4 backdrop-blur-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100/12 bg-slate-950/46 px-4 py-3">
              <p className="text-[11px] tracking-[0.24em] text-slate-300/65">CURRENT NICKNAME</p>
              <p className="mt-2 text-base text-cyan-100">{canAccess ? trimmedNickname : "未设置昵称"}</p>
            </div>

            <div className="rounded-2xl border border-slate-100/12 bg-slate-950/46 px-4 py-3">
              <p className="text-[11px] tracking-[0.24em] text-slate-300/65">LATEST SIGNAL</p>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-100/84">
                {latestMessage ? `${latestMessage.author}：${latestMessage.content}` : "等待第一条留言点亮留言板。"}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 rounded-[28px] border border-slate-100/14 bg-slate-900/42 p-4 backdrop-blur-sm">
          <div className="space-y-3">
            <Input
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                if (feedback) setFeedback("");
              }}
              placeholder="请输入昵称后访问留言板"
              autoComplete="nickname"
              maxLength={24}
              aria-label="留言昵称"
              className="h-11"
              disabled={submitting}
            />

            <Textarea
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                if (feedback) setFeedback("");
              }}
              maxLength={300}
              placeholder="写下今天的心情，让它变成一条掠过屏幕的弹幕。需要昵称才可发言。为了可读性，单条留言限制为 300 字，并展示最近 24 条消息。"
              aria-label="留言内容"
              className="min-h-[300px]"
              disabled={!canAccess || submitting}
            />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[11px] text-slate-300/70">
              {canAccess ? `即将以 ${trimmedNickname} 的身份发送` : "未检测到昵称，暂不可留言"}
            </p>
            <Button type="submit" variant="cyan" className="w-full" disabled={!canAccess || submitting || !trimmedContent}>
              <SendHorizontal size={14} className="mr-1.5" />
              {submitting ? "发送中" : "发布弹幕"}
            </Button>
          </div>

          {feedback && <p className="text-xs text-rose-100/90">{feedback}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
