"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Briefcase, LayoutDashboard, Library } from "lucide-react";

const items = [
  { href: "/app", label: "Дашборд", icon: LayoutDashboard },
  { href: "/app/cases", label: "Дела", icon: Briefcase },
  { href: "/app/knowledge", label: "База знаний", icon: Library },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-border lg:bg-card">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <div className="text-sm font-semibold">Рабочее место юриста</div>
      </div>
      <nav className="flex-1 p-3">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/app" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-3 text-xs text-muted-foreground">MVP • API-интеграция</div>
    </aside>
  );
}

