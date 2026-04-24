"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listCases } from "@/features/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function StatCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {hint ? <CardContent className="text-xs text-muted-foreground">{hint}</CardContent> : null}
    </Card>
  );
}

export function Dashboard() {
  const casesQuery = useQuery({
    queryKey: ["cases", { page: 1, limit: 5 }],
    queryFn: () => listCases({ page: 1, limit: 5 }),
  });

  const readyQuery = useQuery({
    queryKey: ["cases_count", "ready_for_analysis"],
    queryFn: () => listCases({ status: "ready_for_analysis", page: 1, limit: 1 }),
  });

  const draftQuery = useQuery({
    queryKey: ["cases_count", "draft"],
    queryFn: () => listCases({ status: "draft", page: 1, limit: 1 }),
  });

  if (casesQuery.isLoading) {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((k) => (
            <Card key={k}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (casesQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ошибка</CardTitle>
          <CardDescription>Не удалось загрузить данные дашборда.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const data = casesQuery.data;
  if (!data) return null;
  const ready = readyQuery.data?.total ?? 0;
  const draft = draftQuery.data?.total ?? 0;

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Дашборд</h1>
          <p className="text-sm text-muted-foreground">
            Быстрый обзор по делам и действиям.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/cases/new">Создать дело</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Всего дел" value={String(data.total)} />
        <StatCard title="Черновики" value={String(draft)} hint="Дела в статусе draft" />
        <StatCard title="Готово к анализу" value={String(ready)} hint="ready_for_analysis" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние дела</CardTitle>
          <CardDescription>Последние обновления по делам.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.items.length === 0 ? (
            <div className="text-sm text-muted-foreground">Пока нет дел.</div>
          ) : (
            <div className="space-y-2">
              {data.items.map((c) => (
                <Link
                  key={c.id}
                  href={`/app/cases/${c.id}`}
                  className="block rounded-lg border border-border p-3 hover:bg-muted/40"
                >
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.counterpartyName} • {c.status} • {c.priority}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
