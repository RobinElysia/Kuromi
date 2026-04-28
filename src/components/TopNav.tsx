import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const LOGO = new URL("../public/kuromi/1x1/logo.svg", import.meta.url).href;
const KUROMI_STICKER = new URL("../public/kuromi/1x1/gotop_3.png", import.meta.url).href;

interface TopNavProps {
  currentPath: string;
  search: string;
  onSearchChange: (value: string) => void;
  onNavigate: (path: string) => void;
}

const NAV_ITEMS = [
  { label: "Home", path: "/" },
  { label: "post", path: "/post" },
  { label: "trails", path: "/tags" },
  { label: "link", path: "/friends" },
];

function isActive(currentPath: string, targetPath: string) {
  if (targetPath === "/") return currentPath === "/" || currentPath === "/home";
  if (targetPath === "/post") return currentPath === "/post" || currentPath === "/posts" || /^\/posts\/\d+$/.test(currentPath);
  return currentPath === targetPath;
}

export default function TopNav({ currentPath, search, onSearchChange, onNavigate }: TopNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    event.preventDefault();
    onNavigate(path);
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentPath]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderSearchField = () => (
    <div className="relative w-full">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-200/70" />
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="搜索帖子、作者、内容"
        aria-label="站内模糊搜索"
        name="site_search"
        autoComplete="off"
        className="h-9 border-slate-100/20 bg-slate-900/50 pl-9 text-xs sm:text-sm"
      />
    </div>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-slate-100/15 bg-slate-950/55 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <motion.a
            href="/"
            onClick={(event) => handleNavClick(event, "/")}
            className="group flex min-w-0 items-center gap-3"
            whileHover={{ y: -1.5 }}
            transition={{ duration: 0.2 }}
          >
            <img src={LOGO} alt="logo" className="h-10 w-10 transition group-hover:scale-105" />
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-semibold text-slate-50">RobinElysia & Meow</p>
              <p className="truncate font-kuromi-script text-lg leading-none text-cyan-100/90">Kuromi Secret Base</p>
            </div>
          </motion.a>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? "收起导航菜单" : "展开导航菜单"}
            aria-expanded={isMobileMenuOpen}
            className="h-9 w-9 p-0 md:hidden"
          >
            {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </Button>

          <div className="hidden flex-1 items-center justify-end gap-3 md:flex">
            <div className="w-full max-w-[300px]">{renderSearchField()}</div>

            {NAV_ITEMS.map((item) => {
              const active = isActive(currentPath, item.path);
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(event) => handleNavClick(event, item.path)}
                  className={`relative overflow-hidden rounded-xl border px-3 py-2 text-xs transition sm:text-sm ${
                    active
                      ? "border-cyan-200/35 bg-gradient-to-r from-rose-300/35 via-orange-300/25 to-cyan-300/35 text-slate-50"
                      : "border-slate-100/12 bg-slate-900/45 text-slate-200/75 hover:bg-slate-800/60"
                  }`}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="nav-active-glow"
                      className="pointer-events-none absolute inset-0 rounded-xl border border-cyan-100/25"
                      transition={{ type: "spring", stiffness: 460, damping: 35 }}
                    />
                  )}
                </a>
              );
            })}

            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="hidden lg:block">
              <Badge variant="muted" className="border-slate-100/25 bg-slate-900/60 text-slate-200/80">
                <img src={KUROMI_STICKER} alt="" aria-hidden="true" className="mr-1 h-4 w-4" />
                Visitor Mode Ready
              </Badge>
            </motion.div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-3 space-y-3 overflow-hidden rounded-2xl border border-slate-100/15 bg-slate-950/65 p-3 md:hidden"
            >
              {renderSearchField()}

              <div className="grid grid-cols-2 gap-2">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(currentPath, item.path);
                  return (
                    <a
                      key={item.path}
                      href={item.path}
                      onClick={(event) => handleNavClick(event, item.path)}
                      className={`relative flex justify-center overflow-hidden rounded-xl border px-3 py-2.5 text-xs transition ${
                        active
                          ? "border-cyan-200/35 bg-gradient-to-r from-rose-300/35 via-orange-300/25 to-cyan-300/35 text-slate-50"
                          : "border-slate-100/12 bg-slate-900/45 text-slate-200/75 hover:bg-slate-800/60"
                      }`}
                    >
                      {item.label}
                    </a>
                  );
                })}
              </div>

              <Badge variant="muted" className="w-full justify-center border-slate-100/25 bg-slate-900/60 text-slate-200/80">
                <img src={KUROMI_STICKER} alt="" aria-hidden="true" className="mr-1 h-4 w-4" />
                Visitor Mode Ready
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
