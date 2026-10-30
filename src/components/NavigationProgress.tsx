import { useRouterState } from '@tanstack/react-router';
import { LoaderCircle } from 'lucide-react';

export function NavigationProgress() {
  const loading = useRouterState({ select: (state) => state.isLoading });
  if (!loading) return null;
  return <div role="status" className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 border-b-2 border-ink bg-sun px-4 py-2 text-sm font-bold text-ink"><LoaderCircle className="animate-spin" size={18} /> جارٍ التحميل…</div>;
}