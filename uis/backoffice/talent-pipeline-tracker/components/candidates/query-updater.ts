"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams();

  return (entries: Record<string, string>) => {
    const params = new URLSearchParams(current.toString());
    Object.entries(entries).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };
}
