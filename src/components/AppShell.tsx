import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { logout as firebaseLogout } from "@/lib/firebase-auth";
import { flushStore } from "@/lib/store";

export type NavItem = { id: string; label: string; icon: string };

function LogoutBtn({ onClick, compact }: { onClick: () => void; compact?: boolean }) {
  return (
    <button onClick={onClick} aria-label="تسجيل الخروج"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-coral bg-coral/10 font-bold text-coral transition-colors hover:bg-coral hover:text-cream ${compact ? "px-3 py-1.5 text-sm" : "w-full justify-center px-4 py-2.5"}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" />
      </svg>
      خروج
    </button>
  );
}

export function AppShell({ items, active, onNav, children, avatar, name, sub }: {
  items: NavItem[]; active: string; onNav: (id: string) => void; children: ReactNode; avatar: ReactNode; name: string; sub: string;
}) {
  const nav = useNavigate();
  const logout = async () => {
    try { await flushStore(); } finally { await firebaseLogout(); nav({ to: "/" }); }
  };
  const navigateTab = (id: string) => {
    onNav(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="min-h-[100svh] bg-cream lg:pr-[17rem]">
      <aside className="fixed top-0 right-0 z-40 hidden h-[100svh] w-[17rem] flex-col overflow-y-auto border-l-2 border-ink/10 bg-paper p-5 lg:flex">
        <div className="px-3 py-4"><Logo bounce onClick={() => navigateTab('home')} className="h-16 w-auto" /></div>
        <p className="mt-8 mb-2 px-3 text-xs font-bold text-ink/40">القائمة</p>
        <nav className="space-y-1.5">
          {items.map((it) => {
            const on = active === it.id;
            return (
              <button key={it.id} onClick={() => navigateTab(it.id)} className={`relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-lg font-bold transition-colors ${on ? "text-ink" : "text-ink/60 hover:bg-cream"}`}>
                {on && <motion.span layoutId="side" className="absolute inset-0 rounded-2xl border-2 border-ink bg-lime shadow-pop" transition={{ type: "spring", stiffness: 300, damping: 28 }} />}
                <span className={`relative grid h-9 w-9 place-items-center rounded-xl text-lg ${on ? "bg-paper" : "bg-cream"}`}>{it.icon}</span>
                <span className="relative">{it.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3 rounded-3xl border-2 border-ink/10 bg-cream p-3">
          <div className="flex items-center gap-3">
            {avatar}
            <div className="min-w-0 flex-1"><div className="truncate font-bold text-ink">{name}</div><div className="truncate text-xs text-ink/50">{sub}</div></div>
          </div>
          <LogoutBtn onClick={logout} />
        </div>
      </aside>

      <div className="min-w-0 pb-28 lg:pb-0">
        <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-cream/90 px-4 py-2 backdrop-blur lg:hidden">
          <Logo bounce onClick={() => navigateTab('home')} className="h-10 w-auto" />
          <div className="flex items-center gap-2">{avatar}<LogoutBtn onClick={logout} compact /></div>
        </header>
        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink/10 bg-paper/95 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
          {items.map((it) => {
            const on = active === it.id;
            return (
              <button key={it.id} onClick={() => navigateTab(it.id)} className="flex flex-col items-center gap-0.5 py-1 font-display text-base sm:text-lg">
                <span className="relative grid h-9 w-14 place-items-center">
                  {on && <motion.span layoutId="bottom" className="absolute inset-0 rounded-full bg-lime" transition={{ type: "spring", stiffness: 350, damping: 28 }} />}
                  <motion.span animate={{ scale: on ? 1.15 : 1 }} className="relative text-xl">{it.icon}</motion.span>
                </span>
                <span className={on ? "text-ink" : "text-ink/50"}>{it.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function Avatar({ src, name, className = "h-10 w-10" }: { src?: string | null | undefined; name: string; className?: string }) {
  return src ? <img src={src} alt={name} className={`${className} shrink-0 rounded-full border-2 border-lime object-cover`} />
    : <div aria-label={name} className={`${className} grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-ink bg-muted text-paper`}><svg viewBox="0 0 40 40" className="h-full w-full" fill="currentColor" aria-hidden="true"><circle cx="20" cy="14" r="8" /><path d="M4 40v-5a16 13 0 0 1 32 0v5Z" /></svg></div>;
}

export function Stat({ label, value, icon, bg }: { label: string; value: string | number; icon: string; bg: string }) {
  return (
    <motion.div whileHover={{ y: -4, rotate: -1 }} whileTap={{ scale: 0.97 }} className={`relative h-full min-w-0 overflow-hidden rounded-3xl border-2 border-ink ${bg} p-4 shadow-pop`}>
      <div className="absolute -top-6 -left-6 h-20 w-20 animate-blob bg-paper/30" />
      <div className="relative text-2xl">{icon}</div>
      <div className="relative mt-2 font-display text-3xl text-ink sm:text-4xl">{value}</div>
      <div className="relative text-base font-bold text-ink/75 sm:text-lg">{label}</div>
    </motion.div>
  );
}
