import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import type { ReactNode } from "react";

/** Full-screen swipeable pager (RTL aware: swipe left = next). */
export function Pager({ index, onIndex, count, children }: { index: number; onIndex: (i: number) => void; count: number; children: ReactNode }) {
  const end = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -70 && index > 0) onIndex(index - 1);
    else if (info.offset.x > 70 && index < count - 1) onIndex(index + 1);
  };
  return (
    <div className="absolute inset-0 overflow-hidden [overflow:clip]"><AnimatePresence mode="popLayout" initial={false}>
      <motion.div key={index} className="absolute inset-0" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25} onDragEnd={end}
        initial={{ x: "-100%", opacity: 0.5 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "100%", opacity: 0.5 }}
        transition={{ type: "spring", stiffness: 220, damping: 28 }}>
        {children}
      </motion.div>
    </AnimatePresence></div>
  );
}

export function Dots({ count, index, onIndex }: { count: number; index: number; onIndex: (i: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <motion.button key={i} aria-label={`صفحة ${i + 1}`} onClick={() => onIndex(i)} animate={{ width: i === index ? 28 : 10 }}
          className={`h-2.5 rounded-full ${i === index ? "bg-current" : "bg-current opacity-30"}`} />
      ))}
    </div>
  );
}
