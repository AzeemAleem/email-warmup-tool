"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  CubeIcon,
  Square3Stack3DIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  DocumentTextIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: ChartBarIcon },
  { name: "Accounts", href: "/accounts", icon: UsersIcon },
  { name: "Event Log", href: "/events", icon: ClipboardDocumentListIcon },
  { name: "Config", href: "/config", icon: Cog6ToothIcon },
  { name: "Mailer Box Calculator", href: "/mailer-box-calculator", icon: CubeIcon },
  { name: "Rigid Box Calculator", href: "/rigid-box-calculator", icon: Square3Stack3DIcon },
  { name: "Invoice Generator", href: "/invoice-generator", icon: DocumentTextIcon },
  { name: "Saved Invoices", href: "/invoices", icon: FolderOpenIcon },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <div
      className={clsx(
        "flex h-full flex-col bg-gray-900 border-r border-gray-700 transition-[width] duration-200 ease-out shrink-0",
        collapsed ? "w-[4.25rem]" : "w-64",
      )}
    >
      <div
        className={clsx(
          "flex h-16 items-center border-b border-gray-700",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-md bg-pacify-forest flex items-center justify-center shrink-0 ring-1 ring-pacify-gold/40">
              <span className="text-pacify-gold text-xs font-bold tracking-tight">
                P
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                Pacify
              </p>
              <p className="text-[10px] text-pacify-gold/80 uppercase tracking-[0.12em] truncate">
                Packaging
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-md bg-pacify-forest flex items-center justify-center ring-1 ring-pacify-gold/40">
            <span className="text-pacify-gold text-xs font-bold">P</span>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-pacify-gold transition-colors"
          >
            <ChevronDoubleLeftIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center py-2 border-b border-gray-700">
          <button
            type="button"
            onClick={onToggle}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-pacify-gold transition-colors"
          >
            <ChevronDoubleRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <nav className={clsx("flex-1 py-4 space-y-1", collapsed ? "px-2" : "px-3")}>
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={clsx(
                "flex items-center rounded-md text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
                isActive
                  ? "bg-pacify-forest/50 text-pacify-gold border border-pacify-gold/30"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent",
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div
        className={clsx(
          "py-4 border-t border-gray-700",
          collapsed ? "px-2" : "px-3",
        )}
      >
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            title={collapsed ? "Sign out" : undefined}
            className={clsx(
              "flex w-full items-center rounded-md text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors",
              collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
            )}
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
