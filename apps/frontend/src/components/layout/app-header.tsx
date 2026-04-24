"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronRight, LogOut } from "lucide-react";
import { logout, me } from "@/features/api";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function labelForSegment(segment: string) {
  if (segment === "app") return "Приложение";
  if (segment === "cases") return "Дела";
  if (segment === "new") return "Создать";
  if (segment === "knowledge") return "База знаний";
  return segment;
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: me });

  const crumbs = useMemo(() => {
    const seg = pathname.split("/").filter(Boolean);
    return seg.map((s, idx) => ({
      href: "/" + seg.slice(0, idx + 1).join("/"),
      label: labelForSegment(s),
      segment: s,
    }));
  }, [pathname]);

  const logoutMut = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      router.push("/login");
      router.refresh();
    },
  });

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-background px-4 lg:px-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {crumbs.map((c, idx) => (
          <div className="flex items-center gap-2" key={c.href}>
            {idx > 0 ? <ChevronRight className="h-4 w-4" /> : null}
            {idx < crumbs.length - 1 ? (
              <Link
                className={cn("hover:text-foreground", idx === 0 && "hidden")}
                href={c.href}
              >
                {c.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">
                {c.segment === "app" ? "Дашборд" : c.label}
              </span>
            )}
          </div>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="max-w-[260px] justify-between">
            <span className="truncate">{user ? user.fullName : "Пользователь"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              logoutMut.mutate();
            }}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

