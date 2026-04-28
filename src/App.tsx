import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import EasterEggModal from "./components/EasterEggModal";
import Friends from "./components/Friends";
import Home from "./components/Home";
import LoadingScreen from "./components/LoadingScreen";
import Login from "./components/Login";
import PostDetail from "./components/PostDetail";
import PostEditorPage from "./components/PostEditorPage";
import PostPage from "./components/PostPage";
import TagsPage from "./components/TagsPage";
import TopNav from "./components/TopNav";
import { useGamepad } from "./hooks/useGamepad";
import { User } from "./types";

const DESKTOP_WALLPAPERS = [
  new URL("./public/kuromi/16x9/1.png", import.meta.url).href,
  new URL("./public/kuromi/16x9/2.png", import.meta.url).href,
  new URL("./public/kuromi/16x9/3.png", import.meta.url).href,
  new URL("./public/kuromi/16x9/4.png", import.meta.url).href,
  new URL("./public/kuromi/16x9/5.png", import.meta.url).href,
  new URL("./public/kuromi/16x9/6.png", import.meta.url).href,
  new URL("./public/kuromi/16x9/7.png", import.meta.url).href,
  new URL("./public/kuromi/16x9/8.png", import.meta.url).href,
];

const MOBILE_WALLPAPERS = [
  new URL("./public/kuromi/1x1/1.png", import.meta.url).href,
  new URL("./public/kuromi/1x1/2.png", import.meta.url).href,
  new URL("./public/kuromi/1x1/3.png", import.meta.url).href,
  new URL("./public/kuromi/1x1/4.png", import.meta.url).href,
  new URL("./public/kuromi/1x1/5.png", import.meta.url).href,
];

type AppRoute =
  | { type: "home" }
  | { type: "posts" }
  | { type: "postDetail"; postId: number }
  | { type: "editor" }
  | { type: "friends" }
  | { type: "tags" };

function preloadImage(url: string) {
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

function resolveRoute(pathname: string): AppRoute {
  const postMatch = pathname.match(/^\/posts\/(\d+)$/);
  if (postMatch) {
    const postId = Number(postMatch[1]);
    if (Number.isInteger(postId) && postId > 0) return { type: "postDetail", postId };
  }

  if (pathname === "/post" || pathname === "/posts") return { type: "posts" };
  if (pathname === "/editor") return { type: "editor" };
  if (pathname === "/tags") return { type: "tags" };
  if (pathname === "/friends") return { type: "friends" };
  return { type: "home" };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [wallpaperIndex, setWallpaperIndex] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [showInitialLoading, setShowInitialLoading] = useState(false);
  const [isMobileAspect, setIsMobileAspect] = useState(() => window.innerWidth <= window.innerHeight);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [currentQuery, setCurrentQuery] = useState(() => window.location.search);
  const [search, setSearch] = useState("");

  const wallpapers = useMemo(() => (isMobileAspect ? MOBILE_WALLPAPERS : DESKTOP_WALLPAPERS), [isMobileAspect]);

  useEffect(() => {
    const savedUser = localStorage.getItem("kuromi_user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser) as Partial<User>;
      const username = String(parsed.username ?? "").trim();
      const role = parsed.role === "admin" ? "admin" : "guest";
      if (!(role === "guest" && !username)) {
        setUser({ username, role });
      } else {
        localStorage.removeItem("kuromi_user");
      }
    }

    const savedWallpaper = localStorage.getItem("kuromi_wallpaper");
    if (!savedWallpaper) return;

    const parsed = parseInt(savedWallpaper, 10);
    if (Number.isFinite(parsed)) setWallpaperIndex(parsed);
  }, []);

  useEffect(() => {
    const loadingSeen = localStorage.getItem("kuromi_seen_intro_loading");
    if (loadingSeen === "1") return;

    setShowInitialLoading(true);
    const timer = window.setTimeout(() => {
      setShowInitialLoading(false);
      localStorage.setItem("kuromi_seen_intro_loading", "1");
    }, 2200);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname);
      setCurrentQuery(window.location.search);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setIsMobileAspect(window.innerWidth <= window.innerHeight);
    };

    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!wallpapers.length) return;
    const current = wallpapers[wallpaperIndex % wallpapers.length];
    const next = wallpapers[(wallpaperIndex + 1) % wallpapers.length];
    preloadImage(current);
    preloadImage(next);
  }, [wallpaperIndex, wallpapers]);

  const handleNavigate = useCallback((path: string) => {
    const url = new URL(path, window.location.origin);
    const fullPath = `${url.pathname}${url.search}`;
    window.history.pushState({}, "", fullPath);
    setCurrentPath(url.pathname);
    setCurrentQuery(url.search);
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem("kuromi_user", JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("kuromi_user");
    handleNavigate("/");
  };

  const handleChangeWallpaper = () => {
    const nextIndex = wallpaperIndex + 1;
    setWallpaperIndex(nextIndex);
    localStorage.setItem("kuromi_wallpaper", nextIndex.toString());
  };

  const handleEasterEgg = useCallback(() => {
    setShowEasterEgg(true);
  }, []);

  const handleOpenPost = useCallback(
    (postId: number) => {
      handleNavigate(`/posts/${postId}`);
    },
    [handleNavigate]
  );

  useGamepad(handleEasterEgg);

  const activeWallpaper = wallpapers[wallpaperIndex % wallpapers.length];
  const route = resolveRoute(currentPath);
  const routeKey = `${currentPath}${currentQuery}`;

  return (
    <div
      className="relative min-h-screen text-white"
      style={{
        cursor: "url('https://cdn.custom-cursor.com/db/9763/32/sanrio-kuromi-and-baku-cursor.png'), auto",
      }}
    >
      <div className="fixed inset-0 -z-10">
        <img src={activeWallpaper} alt="" aria-hidden="true" className="h-full w-full object-cover object-center" decoding="async" loading="eager" />
      </div>

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,163,180,0.20),rgba(8,12,20,0.75)_55%,rgba(5,8,14,0.88)_100%)] backdrop-blur-[2px]">
        {showInitialLoading ? (
          <LoadingScreen />
        ) : !user ? (
          <Login onLogin={handleLogin} />
        ) : (
          <>
            <TopNav currentPath={currentPath} search={search} onSearchChange={setSearch} onNavigate={handleNavigate} />
            <AnimatePresence mode="wait">
              <motion.div key={routeKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                {route.type === "postDetail" && (
                  <PostDetail postId={route.postId} currentUser={user} onBack={() => handleNavigate("/post")} onOpenTag={(tag) => handleNavigate(`/tags?tag=${encodeURIComponent(tag)}`)} />
                )}
                {route.type === "posts" && <PostPage user={user} search={search} onOpenPost={handleOpenPost} onOpenTag={(tag) => handleNavigate(`/tags?tag=${encodeURIComponent(tag)}`)} />}
                {route.type === "editor" && <PostEditorPage currentUser={user} search={search} onOpenPost={handleOpenPost} />}
                {route.type === "friends" && <Friends search={search} />}
                {route.type === "tags" && <TagsPage search={search} queryString={currentQuery} onNavigate={handleNavigate} onOpenPost={handleOpenPost} />}
                {route.type === "home" && <Home user={user} onLogout={handleLogout} onChangeWallpaper={handleChangeWallpaper} onOpenEditor={() => handleNavigate("/editor")} onOpenPostsPage={() => handleNavigate("/post")} />}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>

      <EasterEggModal isOpen={showEasterEgg} onClose={() => setShowEasterEgg(false)} />
    </div>
  );
}


