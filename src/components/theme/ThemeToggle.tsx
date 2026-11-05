"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { twMerge } from "tailwind-merge";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = theme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={twMerge(
        "flex w-full items-center rounded-md text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-foreground transition-colors",
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
        className,
      )}
    >
      {!mounted ? (
        <span className="h-4 w-4 shrink-0" />
      ) : isDark ? (
        <SunIcon className="h-4 w-4 shrink-0" />
      ) : (
        <MoonIcon className="h-4 w-4 shrink-0" />
      )}
      {!collapsed && (
        <span>{!mounted ? "Theme" : isDark ? "Light mode" : "Dark mode"}</span>
      )}
    </button>
  );
}
