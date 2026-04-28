import React, { useEffect, useMemo, useRef, useState } from "react";
import "animate.css";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import {
  ArrowRight,
  BookOpenText,
  CalendarClock,
  CircleDashed,
  Clock3,
  Crown,
  LogOut,
  MessageSquareMore,
  Palette,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { getMessages, getPosts } from "../lib/dataClient";
import { MessageItem, Post, User } from "../types";
import GuestMessageBoard from "./GuestMessageBoard";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface HomeProps {
  user: User;
  onLogout: () => void;
  onChangeWallpaper: () => void;
  onOpenEditor: () => void;
  onOpenPostsPage: () => void;
}

const SITE_STARTED_AT = new Date("2026-03-08T00:00:00+08:00");
const LEFT_AVATAR = new URL("../public/kuromi/16x9/5.png", import.meta.url).href;
const HEADER_RIBBON = new URL("../public/kuromi/marquee_1.svg", import.meta.url).href;
const HERO_BANNER = new URL("../public/kuromi/16x9/bg_music.png", import.meta.url).href;
const STORY_IMAGE = new URL("../public/kuromi/16x9/PJL_02-1536x864.jpg", import.meta.url).href;
const FEATURE_IMAGE = new URL("../public/kuromi/16x9/PJL_05.png", import.meta.url).href;
const FEATURE_IMAGE_ALT = new URL("../public/kuromi/16x9/PJL_10-1536x864.webp", import.meta.url).href;
const LIFE_IMAGE = new URL("../public/kuromi/16x9/PJL_08-1536x864.webp", import.meta.url).href;
const SIDE_ART = new URL("../public/kuromi/16x9/kv_krm.png", import.meta.url).href;
const STICKER = new URL("../public/kuromi/1x1/gotop_2.png", import.meta.url).href;
const LOGO = new URL("../public/kuromi/1x1/logo.svg", import.meta.url).href;

const HOME_TITLE = "KUROMI SECRET BASE";
const TYPEWRITER_SENTENCE = "由 RobinElysia 与 Meow 管理本站，记录生活与学习的点点滴滴。";

const PROCESS_STEPS = [
  {
    title: "昵称进入",
    desc: "访客仅需昵称即可开始互动",
    icon: UserRound,
  },
  {
    title: "写下留言",
    desc: "在 Home 留言板发布当天记录",
    icon: MessageSquareMore,
  },
  {
    title: "浏览帖子",
    desc: "前往 Post 查看完整时间线",
    icon: BookOpenText,
  },
  {
    title: "切换氛围",
    desc: "一键切换 Kuromi 壁纸",
    icon: Palette,
  },
  {
    title: "权限管理",
    desc: "仅已注册管理员拥有编辑入口",
    icon: ShieldCheck,
  },
] as const;

type RevealPreset = "hero" | "story" | "workflow" | "feature" | "life" | "board" | "footer";

const REVEAL_VIEWPORT = {
  once: true,
  amount: 0.25,
  margin: "0px 0px -12% 0px",
} as const;

const SECTION_REVEALS: Record<RevealPreset, Variants> = {
  hero: {
    hidden: { opacity: 0, y: 72, scale: 0.96, filter: "blur(10px)" },
    show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.8, ease: "easeOut" } },
  },
  story: {
    hidden: { opacity: 0, x: -72, rotate: -1.5, filter: "blur(7px)" },
    show: { opacity: 1, x: 0, rotate: 0, filter: "blur(0px)", transition: { duration: 0.74, ease: "easeOut" } },
  },
  workflow: {
    hidden: { opacity: 0, y: 64, scale: 0.97, clipPath: "inset(12% 0 0 0 round 22px)" },
    show: { opacity: 1, y: 0, scale: 1, clipPath: "inset(0% 0 0 0 round 22px)", transition: { duration: 0.78, ease: "easeOut" } },
  },
  feature: {
    hidden: { opacity: 0, x: 70, rotate: 1.1, filter: "blur(8px)" },
    show: { opacity: 1, x: 0, rotate: 0, filter: "blur(0px)", transition: { duration: 0.77, ease: "easeOut" } },
  },
  life: {
    hidden: { opacity: 0, y: 74, scale: 0.94, rotateX: -9 },
    show: { opacity: 1, y: 0, scale: 1, rotateX: 0, transition: { duration: 0.8, ease: "easeOut" } },
  },
  board: {
    hidden: { opacity: 0, y: 70, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.88, type: "spring", stiffness: 130, damping: 16 } },
  },
  footer: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
  },
};

const PROCESS_GRID_REVEAL: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.12,
    },
  },
};

const PROCESS_CARD_REVEAL: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: "easeOut" } },
};

const MESSAGE_LIMIT = 24;
const DANMAKU_LANES = 6;
const DANMAKU_TARGET_ITEMS = 12;
const DANMAKU_ACCENTS = [
  "border-cyan-200/35 bg-cyan-200/12 text-cyan-50",
  "border-fuchsia-200/30 bg-fuchsia-200/12 text-fuchsia-50",
  "border-rose-200/35 bg-rose-200/12 text-rose-50",
  "border-emerald-200/30 bg-emerald-200/10 text-emerald-50",
] as const;

interface DanmakuItem {
  id: string;
  message: MessageItem;
  lane: number;
  duration: number;
  delay: number;
  accentClassName: string;
}

function formatRuntime(now: Date) {
  const diffMs = Math.max(now.getTime() - SITE_STARTED_AT.getTime(), 0);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${days}天 ${hours}小时 ${minutes}分钟`;
}

function formatPostDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function formatMessageDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function buildDanmakuItems(messages: MessageItem[]) {
  if (messages.length === 0) {
    return [] as DanmakuItem[];
  }

  const rounds = Math.max(2, Math.ceil(DANMAKU_TARGET_ITEMS / messages.length));
  const items: DanmakuItem[] = [];

  for (let round = 0; round < rounds; round += 1) {
    messages.forEach((message, index) => {
      const itemIndex = round * messages.length + index;
      items.push({
        id: `${message.id}-${round}`,
        message,
        lane: itemIndex % DANMAKU_LANES,
        duration: 14 + ((message.content.length + itemIndex * 3) % 8),
        delay: round * 3.1 + (itemIndex % DANMAKU_LANES) * 0.72,
        accentClassName: DANMAKU_ACCENTS[(message.id + round) % DANMAKU_ACCENTS.length],
      });
    });
  }

  return items.slice(0, Math.max(DANMAKU_TARGET_ITEMS, messages.length));
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

function resolvePostExcerpt(content: string, maxLength = 56) {
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

export default function Home({ user, onLogout, onChangeWallpaper, onOpenEditor, onOpenPostsPage }: HomeProps) {
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [recentPostsLoading, setRecentPostsLoading] = useState(true);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState("");
  const [runtimeText, setRuntimeText] = useState(() => formatRuntime(new Date()));
  const [typedLength, setTypedLength] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [flipCard, setFlipCard] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const isAdmin = user.role === "admin";
  const headingChars = useMemo(() => HOME_TITLE.split(""), []);
  const typedSentence = TYPEWRITER_SENTENCE.slice(0, typedLength);
  const prefersReducedMotion = useReducedMotion();
  const revealProps = prefersReducedMotion
    ? ({ initial: false } as const)
    : ({
        initial: "hidden",
        whileInView: "show",
        viewport: REVEAL_VIEWPORT,
      } as const);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const heroParallax = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const storyParallax = useTransform(scrollYProgress, [0, 1], [0, -36]);
  const currentGuestNickname = user.username.trim();
  const canAccessBoard = currentGuestNickname.length > 0;
  const latestMessage = messages[0] ?? null;
  const danmakuItems = useMemo(() => buildDanmakuItems(messages), [messages]);

  useEffect(() => {
    let aborted = false;
    async function loadRecentPosts() {
      setRecentPostsLoading(true);
      try {
        const data = await getPosts(3);
        if (!aborted) setRecentPosts(Array.isArray(data) ? data.slice(0, 3) : []);
      } catch (err) {
        console.error("Failed to fetch recent posts:", err);
      } finally {
        if (!aborted) setRecentPostsLoading(false);
      }
    }

    loadRecentPosts();
    return () => {
      aborted = true;
    };
  }, []);

  useEffect(() => {
    let aborted = false;

    async function loadMessages() {
      if (!canAccessBoard) {
        setMessages([]);
        setMessagesLoading(false);
        setMessagesError("");
        return;
      }

      setMessagesLoading(true);

      try {
        const data = await getMessages(MESSAGE_LIMIT);
        if (!aborted) {
          setMessages(Array.isArray(data) ? data : []);
          setMessagesError("");
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
        if (!aborted) setMessagesError("留言板加载失败");
      } finally {
        if (!aborted) setMessagesLoading(false);
      }
    }

    void loadMessages();
    return () => {
      aborted = true;
    };
  }, [canAccessBoard]);

  const handleMessageCreated = (message: MessageItem) => {
    setMessages((prev) => [message, ...prev].slice(0, MESSAGE_LIMIT));
    setMessagesError("");
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRuntimeText(formatRuntime(new Date()));
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTypedLength((prev) => (prev >= TYPEWRITER_SENTENCE.length ? 0 : prev + 1));
    }, typedLength >= TYPEWRITER_SENTENCE.length ? 1750 : 68);

    return () => window.clearTimeout(timer);
  }, [typedLength]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((prev) => (prev + 1) % PROCESS_STEPS.length);
    }, 2350);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div ref={sectionRef} className="min-h-screen px-4 pb-16 pt-5 sm:px-6 lg:px-10">
      <div className="mx-auto mb-4 w-full max-w-[1550px] overflow-hidden rounded-2xl border border-slate-100/15">
        <motion.img src={HEADER_RIBBON} alt="" aria-hidden="true" className="h-auto w-full opacity-90" animate={{ x: [0, -120] }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} />
      </div>

      <div className="mx-auto flex w-full max-w-[1550px] flex-col gap-6">
        <motion.section
          variants={SECTION_REVEALS.hero}
          {...revealProps}
          className="grid gap-6 lg:grid-cols-[1.1fr_minmax(0,1.4fr)]"
        >
          <Card className="relative overflow-hidden border-slate-100/20 bg-slate-950/66 p-5 sm:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(244,114,182,0.22),transparent_42%),radial-gradient(circle_at_86%_72%,rgba(34,211,238,0.19),transparent_44%)]" />
            <div className="relative space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isAdmin ? "rose" : "muted"} className={isAdmin ? "border-rose-200/50" : "border-slate-100/30"}>
                  {isAdmin ? "Admin Session" : "Visitor Session"}
                </Badge>
                <Badge className="border-cyan-200/35 bg-cyan-200/12 text-cyan-100">当前用户: {user.username}</Badge>
                <Badge variant="muted">Since 2026-03-08</Badge>
              </div>

              <h1 className="animate__animated animate__fadeInUp text-4xl leading-tight tracking-[0.18em] text-slate-50 sm:text-5xl">
                {headingChars.map((char, index) => (
                  <motion.span
                    key={`${char}-${index}`}
                    className="inline-block"
                    style={
                      index < 6
                        ? {
                            color: "transparent",
                            WebkitTextStroke: "1px rgba(241,245,249,0.84)",
                            textShadow: "0 0 16px rgba(148,163,184,0.32)",
                          }
                        : undefined
                    }
                    animate={{ y: [0, -4, 0], rotate: [0, index % 2 === 0 ? -1.8 : 1.8, 0] }}
                    transition={{ duration: 2.8, delay: index * 0.04, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </h1>

              <div className="rounded-2xl border border-slate-100/20 bg-slate-900/52 p-4">
                <p className="text-sm leading-7 text-slate-100/90">
                  {typedSentence}
                  <motion.span className="ml-0.5 inline-block text-cyan-100" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.9, repeat: Infinity }}>
                    |
                  </motion.span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button type="button" variant="cyan" onClick={onOpenPostsPage} className="relative overflow-hidden">
                  <span className="relative z-10 inline-flex items-center">
                    <MessageSquareMore size={16} className="mr-2" /> 前往 Post
                  </span>
                  <motion.span
                    aria-hidden="true"
                    className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full border border-cyan-100/50"
                    animate={{ scale: [1, 12], opacity: [0.7, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    style={{ x: "-50%", y: "-50%" }}
                  />
                </Button>
                <Button type="button" variant="ghost" onClick={onChangeWallpaper}>
                  <Palette size={16} className="mr-2" /> 切换壁纸
                </Button>
                <Button type="button" variant="rose" onClick={onLogout}>
                  <LogOut size={16} className="mr-2" /> 退出登录
                </Button>
                {isAdmin && (
                  <Button type="button" onClick={onOpenEditor}>
                    <Crown size={16} className="mr-2" /> 进入编辑页
                  </Button>
                )}
              </div>

              <Card className="rounded-2xl border-slate-100/15 bg-slate-900/50 p-4 shadow-none">
                <div className="grid gap-2 text-sm text-slate-100/92">
                  <p className="flex items-center gap-2">
                    <CalendarClock size={16} className="text-cyan-100" /> 建站时间: 2026-03-08
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock3 size={16} className="text-cyan-100" /> 运行时间: {runtimeText}
                  </p>
                  <p className="leading-7 text-slate-200/84">站点公告: 博客 v2.0.0 版本</p>
                </div>
              </Card>
            </div>
          </Card>

          <motion.div style={{ y: heroParallax }} className="relative min-h-[430px]">
            <Card className="animate__animated animate__fadeIn relative h-full overflow-hidden border-slate-100/20 bg-slate-950/52 p-0">
              <img src={HERO_BANNER} alt="Kuromi home visual" className="h-full min-h-[430px] w-full object-cover object-center" loading="eager" decoding="async" />
              <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(2,6,23,0.66),rgba(2,6,23,0.22)_42%,rgba(2,6,23,0.74))]" />
              <motion.img
                src={SIDE_ART}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-6 right-0 h-[73%] w-auto opacity-85 mix-blend-screen"
                animate={{ x: [0, 12, 0], y: [0, -10, 0], rotate: [0, 1.8, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="absolute left-5 top-5 flex items-center gap-2">
                <img src={LOGO} alt="" aria-hidden="true" className="h-8 w-auto opacity-80" />
                <p className="text-xs tracking-[0.26em] text-slate-200/86">MO FAN STYLE</p>
              </div>
              <div className="absolute bottom-6 left-6 max-w-[420px] rounded-2xl border border-slate-100/20 bg-slate-900/56 p-4 backdrop-blur-sm">
                <p className="text-sm leading-7 text-slate-100/90">Is a plan to fill the world with KUROMI and KUROMIES.</p>
              </div>
            </Card>

            <motion.img
              src={STICKER}
              alt="draggable sticker"
              className="absolute -bottom-6 right-6 h-20 w-20 cursor-grab active:cursor-grabbing"
              drag
              dragElastic={0.85}
              dragConstraints={{ left: -30, right: 30, top: -36, bottom: 36 }}
              whileTap={{ scale: 0.92 }}
              animate={{ y: [0, -8, 0], rotate: [-6, 7, -6] }}
              transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.section>

        <motion.section
          variants={SECTION_REVEALS.story}
          {...revealProps}
          className="grid gap-6 lg:grid-cols-[1fr_0.95fr]"
          style={{ perspective: 1200 }}
        >
          <motion.figure style={{ y: storyParallax }} className="overflow-hidden rounded-3xl border border-slate-100/16 shadow-[0_20px_45px_rgba(10,16,28,0.42)]">
            <img src={STORY_IMAGE} alt="story visual" className="h-full min-h-[300px] w-full object-cover" loading="lazy" decoding="async" />
          </motion.figure>

          <Card className="flex h-full flex-col justify-between border-slate-100/20 bg-slate-950/62 p-6 sm:p-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="muted" className="w-fit">
                  Recent posts
                </Badge>
                <Badge variant="rose">Latest 3</Badge>
              </div>
              <h2 className="animate__animated animate__fadeInUp text-3xl text-slate-50 sm:text-4xl">New Post</h2>
              <p className="text-sm leading-7 text-slate-100/86">最近三篇帖子</p>

              <div className="space-y-3">
                {recentPostsLoading &&
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={`skeleton-${index}`} className="rounded-2xl border border-slate-100/12 bg-slate-900/40 p-4">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200/15" />
                      <div className="mt-2 h-3 w-11/12 animate-pulse rounded bg-slate-200/10" />
                      <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-slate-200/10" />
                    </div>
                  ))}

                {!recentPostsLoading && recentPosts.length === 0 && (
                  <div className="rounded-2xl border border-slate-100/15 bg-slate-900/45 p-4 text-sm text-slate-200/78">暂无可展示帖子，前往 Post 页面发布后会自动显示在这里。</div>
                )}

                {!recentPostsLoading &&
                  recentPosts.map((post, index) => (
                    <motion.article
                      key={post.id}
                      className="rounded-2xl border border-slate-100/14 bg-[linear-gradient(120deg,rgba(15,23,42,0.7),rgba(30,41,59,0.58))] p-4"
                      whileHover={{ y: -4, scale: 1.01 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-cyan-200/45 bg-cyan-200/12 px-2 text-xs text-cyan-100">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-slate-100">{resolvePostTitle(post)}</p>
                          <p className="mt-1 text-xs leading-6 text-slate-300/78">{resolvePostExcerpt(post.content)}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300/72">
                            <span>{post.author}</span>
                            <span>{formatPostDate(post.createdAt)}</span>
                            <span>{post.comments.length} 条评论</span>
                          </div>
                        </div>
                      </div>
                    </motion.article>
                  ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/15 pt-4 text-sm text-slate-200/82">
              <span className="inline-flex items-center gap-2">
                <BookOpenText size={15} className="text-cyan-100" /> Kuromi Posts Timeline
              </span>
              <Button type="button" size="sm" variant="ghost" onClick={onOpenPostsPage} className="border-slate-100/24">
                查看全部帖子 <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </Card>
        </motion.section>

        <motion.section variants={SECTION_REVEALS.workflow} {...revealProps}>
          <Card className="border-slate-100/18 bg-slate-950/60 px-5 py-7 sm:px-8">
            <div className="mb-5 text-center">
              <Badge variant="muted" className="mx-auto mb-3">
                TECH STACK
              </Badge>
              <h3 className="text-3xl text-slate-50 sm:text-4xl">Personal Stack Map</h3>
              <p className="mt-2 text-sm text-slate-200/80">
                Spring + Redis + React in one flow. RobinElysia 与 Meow 通过 Redis 注册登录成为管理员，访客继续使用昵称模式浏览与互动。
              </p>
            </div>

            <motion.div variants={PROCESS_GRID_REVEAL} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  title: "Java",
                  skills: ["Spring", "SpringMVC", "MyBatis", "SpringBoot", "SpringAI"],
                  color: "from-rose-300/30 to-orange-300/25",
                },
                {
                  title: "Python",
                  skills: ["FastAPI", "Transformers", "peft", "pandas", "pyTorch", "uv"],
                  color: "from-cyan-300/30 to-sky-300/20",
                },
                {
                  title: "Dev",
                  skills: ["git", "Linux", "Docker", "Kubernetes","postman"],
                  color: "from-fuchsia-300/24 to-cyan-300/18",
                },
                {
                  title: "Frontend",
                  skills: ["Vue", "React", "TypeScript", "vite", "Tailwind", "Animate.css"],
                  color: "from-emerald-300/20 to-cyan-300/22",
                },
                {
                  title: "Learning",
                  skills: ["ML", "RL", "Agent engineering", "LangChain", "RAG", "ELK"],
                  color: "from-orange-300/24 to-rose-300/24",
                },
              ].map((group, index) => {
                const isActive = activeStep === index;
                return (
                  <motion.div key={group.title} variants={PROCESS_CARD_REVEAL}>
                    <motion.article
                      className={`relative overflow-hidden rounded-2xl border p-4 transition ${
                        isActive ? "border-cyan-200/50 bg-cyan-200/12" : "border-slate-100/15 bg-slate-900/45"
                      }`}
                      animate={isActive ? { y: [0, -6, 0], scale: [1, 1.03, 1], rotateZ: [0, 0.5, 0] } : { y: 0, scale: 1, rotateZ: 0 }}
                      transition={{ duration: 0.78, ease: "easeInOut" }}
                    >
                      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${group.color} opacity-70`} />
                      <div className="relative z-10">
                        <div className="mb-3 inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-100/25 bg-slate-900/72 px-3 text-xs text-slate-100">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <p className="text-sm text-slate-50">{group.title}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {group.skills.map((skill) => (
                            <Badge key={`${group.title}-${skill}`} variant="muted" className="border-slate-100/20 bg-slate-900/55 text-[11px] text-slate-100/90">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </motion.article>
                  </motion.div>
                );
              })}
            </motion.div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-slate-100/14 bg-slate-900/42 p-4">
                <p className="mb-3 text-xs tracking-[0.2em] text-slate-300/75">LINK HUB</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { label: "RobinElysia GitHub", href: "https://github.com/RobinElysia" },
                    { label: "Meow GitHub", href: "https://github.com/RefarinZen" },
                    { label: "RobinElysia Blog", href: "https://elysia.wiki:223/" },
                    { label: "Meow Blog", href: "#" },
                  ].map((item) => {
                    const isExternal = item.href.startsWith("http");
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        className="group rounded-xl border border-slate-100/20 bg-slate-900/58 px-3 py-2.5 text-xs text-slate-100/92 transition hover:-translate-y-0.5 hover:border-cyan-200/45 hover:bg-cyan-200/12"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <ArrowRight size={12} className="text-cyan-100 transition group-hover:translate-x-0.5" />
                          {item.label}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100/14 bg-slate-900/42 p-4 text-sm text-slate-200/80">
                <p className="inline-flex items-center gap-2">
                  <CircleDashed size={15} className="text-cyan-100" /> Spring / Python / Frontend / Infra are clearly layered for maintainability and scaling.
                </p>
                <p className="mt-3 inline-flex items-center gap-2">
                  <Sparkles size={15} className="text-cyan-100" /> Guest nickname mode and dual-admin constraints are preserved without business regression.
                </p>
              </div>
            </div>
          </Card>
        </motion.section>

        <motion.section
          variants={SECTION_REVEALS.feature}
          {...revealProps}
          className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <Card className="overflow-hidden border-slate-100/16 p-0">
            <img src={FEATURE_IMAGE} alt="精选案例" className="h-full min-h-[320px] w-full object-cover" loading="lazy" decoding="async" />
          </Card>
          <Card className="border-slate-100/16 bg-slate-950/62 p-6">
            <Badge variant="muted" className="mb-3 w-fit">
              我们 · 悄悄话
            </Badge>
            <h3 className="text-3xl text-slate-50">Some Whispers</h3>
            <p className="mt-3 text-sm leading-7 text-slate-100/84">
                  Meow：“你有什么打算么？”<br></br>
                  RobinElysia：“大三上半年打算去实习，下半年去升学”<br></br>
                  Meow：“实习有想法的公司么？”<br></br>
                  RobinElysia：“想去 AI 相关的公司实习看看”<br></br>
            </p>

            <div className="mt-5" style={{ perspective: 1200 }}>
              <motion.div
                className="relative h-44 w-full"
                onHoverStart={() => setFlipCard(true)}
                onHoverEnd={() => setFlipCard(false)}
                onFocus={() => setFlipCard(true)}
                onBlur={() => setFlipCard(false)}
                tabIndex={0}
              >
                <motion.div animate={{ rotateY: flipCard ? 180 : 0 }} transition={{ type: "spring", stiffness: 180, damping: 16 }} className="relative h-full w-full" style={{ transformStyle: "preserve-3d" }}>
                  <div
                    className="absolute inset-0 rounded-2xl border border-slate-100/14 bg-slate-900/56 p-4"
                    style={{
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <p className="text-xs tracking-[0.2em] text-slate-300/72">FRONT</p>
                    <p className="mt-3 text-lg text-slate-100">这里有秘密？</p>
                    <p className="mt-2 text-sm leading-6 text-slate-200/74">快把鼠标移动过来看看~~</p>
                  </div>
                  <div
                    className="absolute inset-0 rounded-2xl border border-cyan-200/34 bg-cyan-200/10 p-4"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <p className="text-xs tracking-[0.2em] text-cyan-100/82">BACK</p>
                    <p className="mt-3 text-lg text-cyan-100">是的！有后续</p>
                    <p className="mt-2 text-sm leading-6 text-slate-100/82">
                    Meow：“你好努力！”<br></br>
                    RobinElysia：“谢谢夸奖！不过你也要加油！”
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </Card>
        </motion.section>

        <motion.section
          variants={SECTION_REVEALS.life}
          {...revealProps}
          className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"
          style={{ perspective: 1200 }}
        >
          <Card className="border-slate-100/16 bg-slate-950/62 p-6">
            <Badge variant="muted" className="mb-3 w-fit">
              生活・故事
            </Badge>
            <h3 className="text-3xl text-slate-50">Life · Stories</h3>
            <p className="mt-3 text-sm leading-7 text-slate-100/84">文字使用描边与分字波动，图片区做错位排版，尽量还原参考图的留白与杂志分区框架。</p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100/15">
              <img src={LEFT_AVATAR} alt="Kuromi sticker" className="h-44 w-full object-cover" loading="lazy" decoding="async" />
            </div>
          </Card>
          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="overflow-hidden border-slate-100/16 p-0">
              <img src={FEATURE_IMAGE_ALT} alt="展区一角" className="h-full min-h-[220px] w-full object-cover" loading="lazy" decoding="async" />
            </Card>
            <Card className="overflow-hidden border-slate-100/16 p-0">
              <img src={LIFE_IMAGE} alt="生活剪影" className="h-full min-h-[220px] w-full object-cover" loading="lazy" decoding="async" />
            </Card>
          </div>
        </motion.section>

        <motion.section
          variants={SECTION_REVEALS.board}
          {...revealProps}
          className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
        >
          <Card className="border-slate-100/18 bg-slate-950/62 p-6">
            <Badge variant="muted" className="mb-3 w-fit">
              HOME BOARD
            </Badge>
            <h3 className="text-3xl text-slate-50">Message board</h3>

            <div className="relative mt-5 overflow-hidden rounded-[28px] border border-slate-100/14 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.84))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_35px_rgba(8,15,30,0.4)]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.03)_49%,transparent_50%,transparent_100%)] bg-[length:100%_56px]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_58%)]" />

              <div className="relative mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-slate-100/12 bg-slate-950/44 px-4 py-3">
                <div>
                  <p className="text-[11px] tracking-[0.24em] text-slate-300/65">BARRAGE SCREEN</p>
                  <p className="mt-1 text-sm text-slate-100/86">留言弹幕展示：</p>
                </div>
                <div className="text-right text-xs text-slate-300/70">
                  <p>最近留言</p>
                  <p className="mt-1 text-cyan-100">{latestMessage ? formatMessageDate(latestMessage.createdAt) : "--"}</p>
                </div>
              </div>

              <div className="relative h-[360px] overflow-hidden rounded-[22px] border border-slate-100/10 bg-slate-950/40 sm:h-[420px]">
                {!canAccessBoard && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-6 text-center backdrop-blur-sm">
                    <Sparkles size={18} className="text-cyan-100" />
                    <p className="text-sm text-slate-100">先在右侧填写昵称，再让留言加入弹幕流。</p>
                  </div>
                )}

                {messagesLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border border-cyan-200/35 border-t-cyan-100/95" />
                    <p className="text-sm text-slate-200/76">留言弹幕载入中...</p>
                  </div>
                )}

                {!messagesLoading && messagesError && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center">
                    <p className="text-sm text-rose-100/90">{messagesError}</p>
                  </div>
                )}

                {!messagesLoading && !messagesError && canAccessBoard && messages.length === 0 && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center">
                    <Sparkles size={18} className="text-cyan-100" />
                    <p className="text-sm text-slate-100">还没有留言，去右侧发出第一条弹幕吧。</p>
                  </div>
                )}

                {!messagesLoading && !messagesError && canAccessBoard && messages.length > 0 && (
                  <>
                    {prefersReducedMotion ? (
                      <div className="grid h-full content-start gap-3 overflow-auto p-4">
                        {messages.map((item) => (
                          <article key={item.id} className="rounded-2xl border border-slate-100/14 bg-slate-900/58 p-3">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <p className="text-xs text-cyan-100">{item.author}</p>
                              <p className="text-[11px] text-slate-300/70">{formatMessageDate(item.createdAt)}</p>
                            </div>
                            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-100/90">{item.content}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="absolute inset-0">
                        {danmakuItems.map((item) => (
                          <motion.article
                            key={item.id}
                            initial={{ x: "110%", opacity: 0 }}
                            animate={{ x: "-125%", opacity: [0, 1, 1, 0.92] }}
                            transition={{
                              duration: item.duration,
                              delay: item.delay,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className={`absolute left-0 top-0 max-w-[min(78vw,24rem)] rounded-full border px-4 py-2 text-sm shadow-[0_10px_24px_rgba(8,15,30,0.24)] backdrop-blur-md ${item.accentClassName}`}
                            style={{
                              top: `calc(${(item.lane * 100) / DANMAKU_LANES}% + 12px)`,
                            }}
                          >
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/70">
                              <span className="truncate">{item.message.author}</span>
                              <span className="h-1 w-1 rounded-full bg-white/45" />
                              <span>{formatMessageDate(item.message.createdAt)}</span>
                            </div>
                            <p className="mt-1 whitespace-nowrap text-sm text-white/92">{item.message.content}</p>
                          </motion.article>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>
          <GuestMessageBoard currentUser={user} latestMessage={latestMessage} messageCount={messages.length} onMessageCreated={handleMessageCreated} />
        </motion.section>

        <motion.footer variants={SECTION_REVEALS.footer} {...revealProps} className="rounded-3xl border border-slate-100/15 bg-slate-950/58 px-5 py-6 text-xs text-slate-300/70 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>Kuromi Secret Base · Home v1.2.21</p>
            <AnimatePresence mode="wait">
              <motion.p key={activeStep} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                当前流程焦点: {PROCESS_STEPS[activeStep].title}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}

