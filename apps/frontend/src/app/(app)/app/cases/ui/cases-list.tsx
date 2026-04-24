"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCases } from "@/features/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const statuses = [
  { value: "", label: "Все статусы" },
  { value: "draft", label: "Черновик" },
  { value: "ready_for_analysis", label: "Готово к анализу" },
  { value: "analyzing", label: "Анализируется" },
  { value: "completed", label: "Завершено" },
  { value: "failed", label: "Ошибка" },
  { value: "archived", label: "Архив" },
];

const priorities = [
  { value: "", label: "Все приоритеты" },
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "high", label: "Высокий" },
];

export function CasesList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const params = useMemo(() => ({ search, status, priority, page, limit }), [search, status, priority, page]);

  const query = useQuery({
    queryKey: ["cases", params],
    queryFn: () => listCases({ search: search || undefined, status: status || undefined, priority: priority || undefined, page, limit }),
  });
  const data = query.data;

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Дела</h1>
          <p className="text-sm text-muted-foreground">
            Список дел с фильтрами, поиском и пагинацией.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/cases/new">Создать</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Поиск</div>
            <Input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Название / контрагент" />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Статус</div>
            <select
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => { setPage(1); setStatus(e.target.value); }}
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Приоритет</div>
            <select
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={priority}
              onChange={(e) => { setPage(1); setPriority(e.target.value); }}
            >
              {priorities.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Список</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : query.isError ? (
            <div className="text-sm text-destructive">Ошибка загрузки.</div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-sm text-muted-foreground">Нет данных.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Контрагент</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Приоритет</TableHead>
                    <TableHead>Обновлено</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <Link className="hover:underline" href={`/app/cases/${c.id}`}>
                          {c.title}
                        </Link>
                      </TableCell>
                      <TableCell>{c.counterpartyName}</TableCell>
                      <TableCell>{c.status}</TableCell>
                      <TableCell>{c.priority}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(c.updatedAt).toLocaleString("ru-RU")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Всего: {data.total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Назад
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * limit >= data.total}
                  >
                    Вперед
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
