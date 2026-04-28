import React, { useState } from "react";
import { motion } from "framer-motion";
import "animate.css";
import { KeyRound, ShieldCheck, Sparkles, UserCircle2 } from "lucide-react";
import { resolveApiUrl } from "../lib/api";
import { loginAdmin, loginGuest } from "../lib/dataClient";
import { User } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface LoginProps {
  onLogin: (user: User) => void;
}

interface AdminRegisterResult {
  success?: boolean;
  message?: string;
  user?: string;
  role?: "admin" | "guest";
}

const HERO_IMAGE = new URL("../public/kuromi/16x9/kv_krm.png", import.meta.url).href;
const PANEL_IMAGE = new URL("../public/kuromi/16x9/PJL_11.jpg", import.meta.url).href;
const STICKER_1 = new URL("../public/kuromi/1x1/gotop_1.png", import.meta.url).href;
const STICKER_2 = new URL("../public/kuromi/1x1/gotop_2.png", import.meta.url).href;

const ADMIN_OPTIONS = ["RobinElysia", "Meow"] as const;

type EntranceMode = "admin" | "register" | "guest";

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<EntranceMode>("admin");
  const [username, setUsername] = useState(ADMIN_OPTIONS[0]);
  const [password, setPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState<typeof ADMIN_OPTIONS[number]>("RobinElysia");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bootstrapSecret, setBootstrapSecret] = useState("");
  const [guestNickname, setGuestNickname] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const resetFeedback = () => {
    setError("");
    setSuccess("");
  };

  const handleAdminLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    resetFeedback();
    setAdminLoading(true);

    try {
      const data = await loginAdmin(username.trim(), password);
      if (data.success && data.user && data.role) {
        onLogin({ username: data.user, role: data.role });
        return;
      }
      setError(data.message || "账号或密码错误");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    resetFeedback();

    if (registerPassword.length < 8) {
      setError("管理员密码至少需要 8 位");
      return;
    }

    if (registerPassword !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (!bootstrapSecret.trim()) {
      setError("请输入该管理员的身份校验码");
      return;
    }

    setRegisterLoading(true);
    try {
      const response = await fetch(resolveApiUrl("/api/admin/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: registerUsername,
          password: registerPassword,
          confirmPassword,
          bootstrapSecret: bootstrapSecret.trim(),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as AdminRegisterResult;
      if (!response.ok || !data.success || !data.user || !data.role) {
        setError(data.message || "管理员注册失败");
        return;
      }

      setSuccess(`${data.user} 注册成功，已自动登入。`);
      onLogin({ username: data.user, role: data.role });
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    const nickname = guestNickname.trim();
    if (!nickname) {
      setError("请输入访客昵称");
      return;
    }

    setGuestLoading(true);
    resetFeedback();

    try {
      const data = await loginGuest(nickname);
      if (!data.success || !data.user) {
        setError(data.message || "访客进入失败");
        return;
      }

      onLogin({ username: data.user, role: "guest" });
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setGuestLoading(false);
    }
  };

  const handleModeChange = (value: string) => {
    setMode(value === "register" ? "register" : value === "guest" ? "guest" : "admin");
    resetFeedback();
  };

  const handleGuestSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void handleGuestLogin();
  };

  const feedback = error || success;
  const feedbackClassName = error ? "text-sm text-rose-300" : success ? "text-sm text-emerald-300" : "text-sm text-slate-300/70";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1320px] items-center px-4 py-8 sm:px-6 lg:px-10">
      <div className="grid w-full items-stretch gap-6 lg:grid-cols-[1.18fr_minmax(380px,500px)]">
        <Card className="relative hidden h-full overflow-hidden border-rose-200/25 bg-slate-950/60 lg:flex lg:min-h-[680px]">
          <img src={HERO_IMAGE} alt="Kuromi Hero" className="absolute inset-0 h-full w-full object-cover object-center opacity-80" loading="eager" decoding="async" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_24%,rgba(244,114,182,0.34),transparent_42%),radial-gradient(circle_at_80%_16%,rgba(34,211,238,0.24),transparent_34%),linear-gradient(135deg,rgba(2,6,23,0.82),rgba(2,6,23,0.52))]" />
          <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(90deg,rgba(244,114,182,0.14),rgba(255,255,255,0),rgba(34,211,238,0.16))] blur-2xl" />

          <motion.img
            src={STICKER_1}
            alt=""
            aria-hidden="true"
            className="absolute bottom-8 right-8 h-24 w-24 opacity-95 drop-shadow-[0_16px_28px_rgba(15,23,42,0.45)]"
            animate={{ y: [0, -10, 0], rotate: [0, 3, 0], scale: [1, 1.04, 1] }}
            transition={{ duration: 4.1, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.img
            src={STICKER_2}
            alt=""
            aria-hidden="true"
            className="absolute right-28 top-8 h-16 w-16 opacity-90"
            animate={{ y: [0, 7, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          />

          <CardContent className="relative z-10 mt-auto space-y-6 p-8">
            <Badge variant="rose" className="w-fit border-rose-200/45 bg-rose-200/15 text-rose-100">
              RobinElysia · Meow
            </Badge>
            <div className="space-y-3">
              <h1 className="animate__animated animate__fadeInUp text-4xl leading-tight text-slate-50">Kuromi Secret Base</h1>
              <p className="max-w-xl text-sm leading-7 text-slate-100/86">
                RobinElysia 与 Meow 为本站管理员。访客需要通过昵称模式进入，浏览、评论和留言。
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
                className="rounded-[28px] border border-slate-100/18 bg-slate-900/46 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.45)] backdrop-blur-xl"
              >
                <p className="text-xs tracking-[0.16em] text-slate-200/75">ENTRANCE FLOW</p>
                <div className="mt-3 space-y-3 text-sm leading-7 text-slate-100/84">
                  <p>
                    当星空划过黑夜，我们才能找到通往基地的秘密入口...<br></br>
                    留下足迹与我们一同守护这个小小的宇宙吧。
                  </p>
                </div>
              </motion.div>

              <div className="relative overflow-hidden rounded-[28px] border border-slate-100/16 bg-slate-900/28">
                <img src={PANEL_IMAGE} alt="Kuromi panel" className="h-full w-full object-cover object-center" loading="lazy" decoding="async" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/82 via-slate-950/10 to-transparent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <motion.div className="h-full" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
          <Card className="relative flex h-full flex-col overflow-hidden border-slate-100/25 bg-slate-950/76 lg:min-h-[680px]">
            <div className="absolute inset-x-6 top-0 h-24 rounded-full bg-rose-300/10 blur-3xl" />
            <CardHeader className="relative space-y-3 border-b border-slate-100/10 bg-slate-900/30">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200/50 bg-slate-900/70 text-rose-100 shadow-[0_10px_20px_rgba(251,113,133,0.18)]">
                  <Sparkles size={20} />
                </div>
                <div>
                  <CardTitle className="text-2xl text-slate-50">登录基地</CardTitle>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge className="border border-cyan-200/30 bg-cyan-200/12 text-cyan-100">Redis auth</Badge>
                <Badge variant="muted" className="border-slate-100/25">Kuromi glass panel</Badge>
                <Badge variant="rose" className="border-rose-200/35 bg-rose-200/12">Only RobinElysia & Meow</Badge>
              </div>
            </CardHeader>

            <CardContent className="relative flex flex-1 flex-col space-y-5 p-6 sm:p-8">
              <Tabs value={mode} onValueChange={handleModeChange} className="flex w-full flex-1 flex-col">
                <TabsList className="grid h-auto w-full grid-cols-3 bg-slate-900/60 p-1">
                  <TabsTrigger value="admin" className="h-10 gap-2">
                    <ShieldCheck size={16} />
                    登录
                  </TabsTrigger>
                  <TabsTrigger value="register" className="h-10 gap-2">
                    <KeyRound size={16} />
                    注册
                  </TabsTrigger>
                  <TabsTrigger value="guest" className="h-10 gap-2">
                    <UserCircle2 size={16} />
                    访客
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="admin" className="mt-4 flex-1 data-[state=active]:flex">
                  <motion.form
                    onSubmit={handleAdminLogin}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                    className="flex h-full w-full flex-col gap-5 rounded-[30px] border border-slate-100/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.4),rgba(15,23,42,0.18))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5"
                  >
                    <div className="grid gap-4 xl:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs tracking-[0.14em] text-slate-200/85">ACCOUNT</span>
                        <select
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          className="h-12 w-full rounded-2xl border border-slate-100/25 bg-slate-900/65 px-4 text-slate-100 outline-none transition focus:border-cyan-200/55"
                        >
                          {ADMIN_OPTIONS.map((item) => (
                            <option key={item} value={item} className="bg-slate-950 text-slate-100">
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs tracking-[0.14em] text-slate-200/85">PASSWORD</span>
                        <Input
                          type="password"
                          placeholder="输入管理员密码"
                          aria-label="管理员密码"
                          autoComplete="current-password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          className="h-12 rounded-2xl border-slate-100/25 bg-slate-900/65 px-4"
                        />
                      </label>
                    </div>

                    <div className="grid flex-1 gap-4 lg:grid-rows-[minmax(0,1fr)_auto]">
                      <div className="relative flex min-h-[180px] flex-col justify-end overflow-hidden rounded-[28px] border border-slate-100/16 bg-[linear-gradient(135deg,rgba(244,114,182,0.16),rgba(15,23,42,0.72),rgba(34,211,238,0.1))] px-5 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.28)] backdrop-blur-xl">
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.22),transparent_70%)] blur-2xl" />
                        <div className="pointer-events-none absolute -right-8 bottom-0 h-28 w-28 rounded-full bg-cyan-300/10 blur-3xl" />
                        <p className="relative text-xs tracking-[0.15em] text-slate-200/75">ADMIN ACCESS</p>
                        <p className="relative mt-3 max-w-md text-sm leading-7 text-slate-100/84">
                          需要钥匙才能开启，你真的有钥匙么？<br></br>
                          可以试试看，或者直接当个快乐的访客也不错哦~
                        </p>
                      </div>

                      <div className="grid gap-3 rounded-[24px] border border-slate-100/10 bg-slate-900/35 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <p className="text-xs leading-6 tracking-[0.14em] text-slate-300/72">
                          ROBINELYSIA / MEOW 
                        </p>
                        <Button type="submit" className="h-12 w-full rounded-2xl text-base sm:min-w-[180px]" disabled={adminLoading}>
                          {adminLoading ? "管理员登录中..." : "管理员登录"}
                        </Button>
                      </div>
                    </div>
                  </motion.form>
                </TabsContent>

                <TabsContent value="register" className="mt-4">
                  <motion.form onSubmit={handleRegister} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="space-y-4">
                    <div className="rounded-[28px] border border-rose-200/18 bg-slate-900/48 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <p className="text-xs tracking-[0.16em] text-rose-100/80">ADMIN REGISTER</p>
                      <p className="mt-2 text-sm leading-7 text-slate-100/84">仅 RobinElysia 与 Meow 可注册。</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs tracking-[0.14em] text-slate-200/85">ADMIN</span>
                        <select
                          value={registerUsername}
                          onChange={(event) => setRegisterUsername(event.target.value as typeof ADMIN_OPTIONS[number])}
                          className="h-11 w-full rounded-xl border border-slate-100/25 bg-slate-900/65 px-3 text-slate-100 outline-none transition focus:border-rose-200/55"
                        >
                          {ADMIN_OPTIONS.map((item) => (
                            <option key={item} value={item} className="bg-slate-950 text-slate-100">
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs tracking-[0.14em] text-slate-200/85">BOOTSTRAP SECRET</span>
                        <Input
                          type="password"
                          placeholder="输入身份校验码"
                          aria-label="管理员身份校验码"
                          autoComplete="off"
                          value={bootstrapSecret}
                          onChange={(event) => setBootstrapSecret(event.target.value)}
                          className="h-11 rounded-xl border-slate-100/25"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs tracking-[0.14em] text-slate-200/85">PASSWORD</span>
                        <Input
                          type="password"
                          placeholder="至少 8 位"
                          aria-label="管理员注册密码"
                          autoComplete="new-password"
                          value={registerPassword}
                          onChange={(event) => setRegisterPassword(event.target.value)}
                          className="h-11 rounded-xl border-slate-100/25"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs tracking-[0.14em] text-slate-200/85">CONFIRM</span>
                        <Input
                          type="password"
                          placeholder="再次输入密码"
                          aria-label="确认管理员注册密码"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          className="h-11 rounded-xl border-slate-100/25"
                        />
                      </label>
                    </div>

                    <p className={feedbackClassName}>{feedback || "注册仅用于双管理员初始化，访客没有注册入口。"}</p>

                    <Button type="submit" variant="ghost" disabled={registerLoading} className="h-11 w-full border-slate-100/30 text-base text-slate-100">
                      <KeyRound size={16} className="mr-2" />
                      {registerLoading ? "管理员注册中..." : "管理员注册"}
                    </Button>
                  </motion.form>
                </TabsContent>

                <TabsContent value="guest" className="mt-4">
                  <motion.form onSubmit={handleGuestSubmit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="space-y-4">

                    <div className="rounded-[24px] border border-cyan-200/14 bg-cyan-200/8 p-4 text-sm leading-7 text-slate-100/84">
                      访客模式可浏览、留言和评论，但无法编辑站点内容；管理员账号名已保留，不允许被访客昵称占用。
                    </div>

                    <div className="space-y-2 rounded-[28px] border border-slate-100/20 bg-slate-900/45 p-4">
                      <label htmlFor="guestNickname" className="text-xs tracking-[0.14em] text-slate-200/85">
                        GUEST NICKNAME
                      </label>
                      <Input
                        id="guestNickname"
                        type="text"
                        maxLength={24}
                        value={guestNickname}
                        onChange={(event) => setGuestNickname(event.target.value)}
                        placeholder="输入访客昵称（必填）"
                        aria-label="访客昵称"
                        autoComplete="nickname"
                        className="h-10 rounded-lg border-slate-100/25"
                      />
                    </div>

                    <p className={feedbackClassName}>{feedback || "访客登入不影响留言板、评论和帖子浏览。"}</p>

                    <Button type="submit" variant="ghost" disabled={guestLoading} className="h-11 w-full border-slate-100/30 text-base text-slate-100">
                      <UserCircle2 size={16} className="mr-2" />
                      {guestLoading ? "访客进入中..." : "访客进入"}
                    </Button>
                  </motion.form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
