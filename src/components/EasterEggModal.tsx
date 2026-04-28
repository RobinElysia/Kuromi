import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface EasterEggModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HEART_KUROMI = new URL("../public/kuromi/1x1/gotop_3.png", import.meta.url).href;

export default function EasterEggModal({ isOpen, onClose }: EasterEggModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}>
            <Card className="relative w-full max-w-sm overflow-hidden border-rose-200/40 bg-slate-950/85">
              <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-rose-300/85 via-orange-300/75 to-cyan-300/85" />

              <CardContent className="p-8 pt-10 text-center">
                <motion.img
                  src={HEART_KUROMI}
                  alt=""
                  aria-hidden="true"
                  className="mx-auto mb-5 h-24 w-24"
                  animate={{ y: [0, -8, 0], rotate: [0, 3, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />

                <h2 className="mb-4 bg-gradient-to-r from-rose-200 via-orange-100 to-cyan-100 bg-clip-text text-2xl font-bold text-transparent">惊喜彩蛋</h2>

                <p className="text-lg font-medium leading-relaxed text-rose-100">我喜欢你，比昨天多一点，比明天少一点。</p>

                <Button type="button" onClick={onClose} variant="ghost" className="mt-7 w-full border-slate-100/20">
                  关闭
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
