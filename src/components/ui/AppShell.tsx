"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";

const STORAGE_KEY = "sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        collapsed={ready ? collapsed : false}
        onToggle={toggleCollapsed}
      />
      <main className="flex-1 min-w-0 overflow-y-auto bg-gray-950 scrollbar-thin">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
