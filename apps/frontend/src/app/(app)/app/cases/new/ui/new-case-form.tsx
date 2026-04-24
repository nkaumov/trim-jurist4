"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createCase } from "@/features/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const Schema = z.object({
  title: z.string().min(1),
  counterpartyName: z.string().min(1),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  contractType: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type Values = z.input<typeof Schema>;

export function NewCaseForm() {
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      title: "",
      counterpartyName: "",
      priority: "medium",
      contractType: "",
      description: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const parsed = Schema.parse(values);
      return createCase({
        title: parsed.title,
        counterpartyName: parsed.counterpartyName,
        priority: parsed.priority,
        contractType: parsed.contractType || null,
        description: parsed.description || null,
        notes: parsed.notes || null,
      });
    },
    onSuccess: (data) => {
      toast.success("Дело создано");
      router.push(`/app/cases/${data.id}`);
      router.refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Ошибка"),
  });

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold">Создать дело</h1>
        <p className="text-sm text-muted-foreground">
          Заполните основные поля. Документы и разногласия добавляются на карточке дела.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Основные данные</CardTitle>
          <CardDescription>Поля отображаются на русском, код — на английском.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          >
            <div className="grid gap-2">
              <Label htmlFor="title">Название</Label>
              <Input id="title" {...form.register("title")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="counterpartyName">Контрагент</Label>
              <Input id="counterpartyName" {...form.register("counterpartyName")} />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Приоритет</Label>
                <select
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  {...form.register("priority")}
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contractType">Тип договора</Label>
                <Input id="contractType" {...form.register("contractType")} placeholder="Напр. Поставка" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea id="description" {...form.register("description")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Заметки</Label>
              <Textarea id="notes" {...form.register("notes")} />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Создаем..." : "Создать"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
