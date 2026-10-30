import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

const variants = {
  lime: "bg-lime text-ink",
  ink: "bg-ink text-cream",
  sun: "bg-sun text-ink",
  coral: "bg-coral text-cream",
  ghost: "bg-paper/10 text-cream border-2 border-cream/30 backdrop-blur",
  outline: "bg-paper text-ink border-2 border-ink",
};

export function FancyButton({ variant = "lime", className, onClick, children, ...rest }: HTMLMotionProps<"button"> & { variant?: keyof typeof variants }) {
  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ y: 3, scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-bold text-base shadow-pop transition-shadow active:shadow-none disabled:opacity-50 disabled:pointer-events-none",
        variant !== "ghost" && "border-2 border-ink",
        variants[variant], className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
