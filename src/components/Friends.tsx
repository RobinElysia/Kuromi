import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Link2, Users2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface FriendsProps {
  search: string;
}

interface FriendTag {
  text: string;
  color?: "green" | "orange" | "purple";
}

interface FriendItem {
  name: string;
  avatar: string;
  description: string;
  link: string;
  tags: FriendTag[];
}

const KUROMI_SIDE = new URL("../public/kuromi/1x1/illust_2.png", import.meta.url).href;
const KUROMI_MARK = new URL("../public/kuromi/1x1/logo_gradient_en.svg", import.meta.url).href;
const BG_ABOUT = new URL("../public/kuromi/16x9/bg_about.png", import.meta.url).href;
const BG_MUSIC = new URL("../public/kuromi/16x9/bg_music.png", import.meta.url).href;
const STAR_3 = new URL("../public/kuromi/1x1/gotop_3.png", import.meta.url).href;
const PJL_POSTER = new URL("../public/kuromi/1x1/PJL_01-1536x1536.jpg", import.meta.url).href;

const LOCAL_AVATARS = {
  robin: new URL("../public/img/RobinElysia.jpg", import.meta.url).href,
  icstudio: new URL("../public/img/fengcheng.jpg", import.meta.url).href,
  sanjiu: new URL("../public/img/sanjiu.jpg", import.meta.url).href,
  dlqc: new URL("../public/img/DLQC.jpg", import.meta.url).href,
  remi: new URL("../public/img/Remi.jpg", import.meta.url).href,
  riko: new URL("../public/img/Riko.jpg", import.meta.url).href,
} as const;

const FRIENDS: FriendItem[] = [
  {
    name: "RobinElysia",
    avatar: LOCAL_AVATARS.robin,
    description: "全栈开发ing | 热爱技术与创新",
    link: "https://elysia.wiki:223/",
    tags: [
      { text: "CS补天计划ing" },
      { text: "Java全栈", color: "green" },
      { text: "站主", color: "purple" },
    ],
  },
  {
    name: "ICStudio",
    avatar: LOCAL_AVATARS.icstudio,
    description: "枫城 | React全栈",
    link: "http://icstudio.top/",
    tags: [
      { text: "一站式开发" },
      { text: "Rust 带盐人", color: "green" },
    ],
  },
  {
    name: "SanJiu",
    avatar: LOCAL_AVATARS.sanjiu,
    description: "密码学/加密研究者 | 网络安全",
    link: "www.sanjiuctf.cn",
    tags: [
      { text: "密码学", color: "orange" },
      { text: "__，__！", color: "purple" },
    ],
  },
  {
    name: "Marisa",
    avatar: "https://pica.zhimg.com/466406875631534fc5629e5c75a58a7a_xll.jpg?source=32738c0c&needBackground=1",
    description: "雾雨魔法店 CEO | 魔理沙",
    link: "https://marisa.moe/",
    tags: [
      { text: "phd 在读", color: "orange" },
      { text: "知乎大佬", color: "green" },
    ],
  },
  {
    name: "Purpleplanen",
    avatar: "https://www.purpleplanen.top/logo.png",
    description: "前端开发 | Fumo",
    link: "https://www.purpleplanen.top/AboutMe.html",
    tags: [
      { text: "前端", color: "purple" },
      { text: "UI/UX" },
    ],
  },
  {
    name: "DLQC",
    avatar: LOCAL_AVATARS.dlqc,
    description: "努力学习ing",
    link: "./AboutUs.html#关于dlqc",
    tags: [
      { text: "C/C++" },
      { text: "网络安全", color: "green" },
    ],
  },
  {
    name: "Remi Guan",
    avatar: LOCAL_AVATARS.remi,
    description: "全栈 | 蕾米",
    link: "https://www.purpleplanen.top/Notes/%E6%91%98%E5%BD%95%E8%AF%AD%E5%8F%A5/remi.html",
    tags: [
      { text: "技术沉思录", color: "orange" },
      { text: "舞萌", color: "purple" },
    ],
  },
  {
    name: "Riko",
    avatar: LOCAL_AVATARS.riko,
    description: "平面设计 | 转行ing",
    link: "https://akiyamariko.github.io/Blog/",
    tags: [
      { text: "前端开发入门中", color: "green" },
      { text: "明日方舟", color: "purple" },
    ],
  },
  {
    name: "Xiao Hai",
    avatar: "https://s2.loli.net/2025/02/02/ELbK6urJqYvgBPj.jpg",
    description: "小海的角落",
    link: "https://norubias.site/#/",
    tags: [
      { text: "孤独摇滚", color: "purple" },
      { text: "Web前端开发者", color: "orange" },
    ],
  },
  {
    name: "rand777",
    avatar: "https://avatars.githubusercontent.com/u/91131723?s=400&u=cc52bb8ae67e4a4706570ac84399dc7519cfa749&v=4",
    description: "摇摇晃晃，也能到达目的地。",
    link: "https://blog.rand777.space/",
    tags: [
      { text: "笨笨的", color: "green" },
      { text: "ENTJ-A", color: "purple" },
    ],
  },
  {
    name: "LunaRain_079",
    avatar: "https://avatars.githubusercontent.com/u/176664901?v=4",
    description: "独酌清月",
    link: "https://www.lunarain.top/",
    tags: [
      { text: "CS learner", color: "orange" },
      { text: "ENTJ-A", color: "purple" },
    ],
  },
  {
    name: "Immortal's Blog",
    avatar: "https://q1.qlogo.cn/g?b=qq&nk=188191770&s=640",
    description: "Immortal's Blog",
    link: "https://blog.immortel.top/",
    tags: [{ text: "随便吧", color: "purple" }],
  },
];

function normalizeHref(raw: string) {
  const value = raw.trim();
  if (!value) return "#";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("./")) return value.slice(1);
  if (value.startsWith("/")) return value;
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) return "#";
  return `https://${value}`;
}

function tagClass(color: FriendTag["color"]) {
  if (color === "green") return "border-emerald-200/40 bg-emerald-200/12 text-emerald-100";
  if (color === "orange") return "border-orange-200/45 bg-orange-200/12 text-orange-100";
  if (color === "purple") return "border-fuchsia-200/45 bg-fuchsia-200/12 text-fuchsia-100";
  return "";
}

export default function Friends({ search }: FriendsProps) {
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return FRIENDS;

    return FRIENDS.filter((friend) => {
      const combined = `${friend.name} ${friend.description} ${friend.tags.map((tag) => tag.text).join(" ")}`.toLowerCase();
      return combined.includes(keyword);
    });
  }, [search]);

  return (
    <section className="mx-auto w-full max-w-[1560px] px-4 pb-10 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pt-7">
      <Card className="relative overflow-hidden border-rose-200/25 bg-slate-950/68 p-5 sm:p-6 lg:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(244,114,182,0.24),transparent_42%),radial-gradient(circle_at_74%_72%,rgba(34,211,238,0.22),transparent_48%)]" />
        <CardContent className="relative grid items-center gap-5 p-0 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-7">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-100/25 bg-slate-900/50 px-3 py-1 text-xs text-slate-100/90">
              <Users2 size={14} className="text-cyan-100" /> 友情链接
            </div>
            <h2 className="text-3xl text-slate-50 sm:text-4xl">Kuromi Friends Network</h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-100/88 sm:text-[15px]">
              本站由 RobinElysia 与 Meow 管理；访客模式可浏览。这里整理了朋友的站点，欢迎互访。
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge className="border-cyan-200/40 bg-cyan-200/12 text-cyan-100">共 {FRIENDS.length} 位link伙伴</Badge>
              <Badge variant="rose" className="border-rose-200/45 bg-rose-200/12">保留当前站点配色与背景层</Badge>
            </div>
          </div>

          <div className="relative mx-auto h-40 w-full max-w-[280px] overflow-hidden rounded-3xl border border-slate-100/20 sm:h-48">
            <img src={KUROMI_SIDE} alt="Kuromi" className="h-full w-full object-cover object-center" loading="lazy" decoding="async" />
            <img src={KUROMI_MARK} alt="" aria-hidden="true" className="absolute bottom-3 right-3 h-10 w-10 opacity-80" loading="lazy" decoding="async" />
            <motion.img
              src={STAR_3}
              alt=""
              aria-hidden="true"
              className="absolute left-3 top-3 h-12 w-12"
              animate={{ y: [0, -5, 0], rotate: [0, -2, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((friend, index) => {
          const href = normalizeHref(friend.link);
          const external = /^https?:\/\//i.test(href);

          return (
            <motion.div key={friend.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: index * 0.02 }}>
              <Card className="group relative overflow-hidden border-slate-100/18 bg-slate-950/70 transition hover:-translate-y-0.5 hover:border-cyan-200/35">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-300/80 via-orange-300/70 to-cyan-300/80" />
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <img
                      src={friend.avatar}
                      alt={`${friend.name} avatar`}
                      className="h-14 w-14 rounded-2xl border border-slate-100/25 object-cover"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg text-slate-50">{friend.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-200/85">{friend.description}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {friend.tags.map((tag, tagIndex) => (
                      <Badge key={`${friend.name}-${tagIndex}-${tag.text}`} className={tagClass(tag.color)}>
                        {tag.text}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-300/75">
                      <Link2 size={13} />
                      <span className="max-w-[190px] truncate">{href}</span>
                    </div>

                    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer noopener" : undefined}>
                      <Button type="button" variant="cyan" size="sm">
                        访问 <ExternalLink size={13} className="ml-1.5" />
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="mt-5 border-slate-100/18 py-10 text-center text-slate-200/80">
          <p className="text-sm">当前搜索词没有匹配到link，请尝试其他关键词。</p>
        </Card>
      )}
    </section>
  );
}
