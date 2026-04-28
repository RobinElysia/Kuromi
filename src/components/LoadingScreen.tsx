import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const BRAND_MARK = new URL("../public/kuromi/1x1/logo.svg", import.meta.url).href;
const BRAND_GLOW = new URL("../public/kuromi/1x1/logo_gradient_en.svg", import.meta.url).href;
const BOOT_STICKER = new URL("../public/kuromi/1x1/gotop_1.png", import.meta.url).href;

export default function LoadingScreen() {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((prev) => Math.min(prev + 6, 100));
    }, 120);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-rose-200/30 bg-slate-950/74 p-8 shadow-[0_24px_80px_rgba(12,19,31,0.6)] backdrop-blur-md"
      >
        <motion.img
          src={BOOT_STICKER}
          alt=""
          aria-hidden="true"
          className="absolute right-4 top-4 h-14 w-14"
          animate={{ y: [0, -5, 0], rotate: [0, 3, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="mb-5 flex items-center justify-center gap-2">
          <img src={BRAND_MARK} alt="Kuromi mark" className="h-14 w-auto" />
          <img src={BRAND_GLOW} alt="" aria-hidden="true" className="h-8 w-auto opacity-85" />
        </div>

        <p className="text-center text-sm tracking-[0.26em] text-rose-100/85">SECRET BASE BOOTING</p>
        <p className="mt-2 text-center text-xs text-slate-300/80">Loading visual assets and memory fragments…</p>

        <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-slate-800/80">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-rose-400 via-orange-300 to-cyan-300"
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
        </div>

        <p className="mt-3 text-right text-xs text-cyan-100/85">{progress}%</p>
      </motion.div>
    </div>
  );
}
