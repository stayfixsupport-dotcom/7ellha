import logoImg from "@/assets/logo.webp";
import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const HOP = { y: [0, -20, 0, -9, 0], transition: { duration: 0.62, times: [0, 0.3, 0.58, 0.79, 1], ease: "easeOut" as const } };

/**
 * The wordmark, flat on the page: no box shadow, no drop shadow, no glow.
 * Pass `bounce` to make it tap-bouncy, and `onClick` when it should also navigate.
 */
export function Logo({ className, onClick, bounce = false }: { className?: string; onClick?: () => void; bounce?: boolean }) {
  const hop = useAnimationControls();
  const image = <img src={logoImg} alt="حلّها" width={1221} height={614} draggable={false}
    className={cn("block w-auto select-none", className ?? "h-12 sm:h-14")} />;
  if (!bounce && !onClick) return image;
  return (
    <motion.button type="button" aria-label="حلّها" whileTap={{ scale: 0.94 }}
      onClick={() => { hop.start(HOP); onClick?.(); }}
      className="block cursor-pointer appearance-none border-0 bg-transparent p-0 text-inherit shadow-none outline-none">
      <motion.span initial={false} animate={hop} className="block">{image}</motion.span>
    </motion.button>
  );
}

/** Calm static background: creamy white with a soft yellow fade at the bottom. */
export function Backdrop(_: { tone?: "dark" | "light" }) {
  return <div className="pointer-events-none absolute inset-0 bg-creamfade" aria-hidden />;
}

export function Confetti({ fire }: { fire: number }) {
  const [bits, setBits] = useState<{ id: number; x: number; c: string; r: number; d: number }[]>([]);
  useEffect(() => {
    if (!fire) return;
    const cs = ["bg-lime", "bg-sun", "bg-coral", "bg-teal", "bg-forest"];
    setBits(Array.from({ length: 60 }, (_, i) => ({ id: fire * 100 + i, x: Math.random() * 100, c: cs[i % 5]!, r: Math.random() * 720, d: 1.2 + Math.random() * 1.4 })));
    const t = setTimeout(() => setBits([]), 3000);
    return () => clearTimeout(t);
  }, [fire]);
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden" aria-hidden>
      {bits.map((b) => (
        <motion.span key={b.id} className={cn("absolute top-0 h-3 w-2 rounded-sm", b.c)} style={{ left: `${b.x}%` }}
          initial={{ y: -20, rotate: 0, opacity: 1 }} animate={{ y: "105vh", rotate: b.r, opacity: [1, 1, 0] }}
          transition={{ duration: b.d, ease: "easeIn" }} />
      ))}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("relative h-3 w-full overflow-hidden rounded-full bg-ink/10", className)}>
      <motion.div className="absolute inset-y-0 right-0 rounded-full bg-limeglow" animate={{ width: `${value}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} />
      <motion.div className="absolute inset-y-0 w-10 bg-paper/50 blur-sm" animate={{ right: [`-10%`, `110%`] }} transition={{ duration: 2.2, repeat: Infinity }} />
    </div>
  );
}
