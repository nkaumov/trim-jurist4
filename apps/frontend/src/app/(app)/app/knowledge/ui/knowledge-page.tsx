"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteOrgKnowledgeDoc, listOrgKnowledge, uploadOrgKnowledge } from "@/features/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function KnowledgePage() {
  const qc = useQueryClient();
  const orgQuery = useQuery({ queryKey: ["org_knowledge"], queryFn: listOrgKnowledge });
  const orgDocs = orgQuery.data ?? [];

  const uploadMut = useMutation({
    mutationFn: uploadOrgKnowledge,
    onSuccess: async () => {
      toast.success("Документ добавлен");
      await qc.invalidateQueries({ queryKey: ["org_knowledge"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Ошибка"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteOrgKnowledgeDoc,
    onSuccess: async () => {
      toast.success("Удалено");
      await qc.invalidateQueries({ queryKey: ["org_knowledge"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Ошибка удаления"),
  });

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">База знаний</h1>
          <p className="text-sm text-muted-foreground">
            Документы организации.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => orgQuery.refetch()}
          disabled={orgQuery.isFetching}
        >
          {orgQuery.isFetching ? "Обновляем..." : "Обновить"}
        </Button>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Документы организации</CardTitle>
            <CardDescription>Файлы, которые могут использоваться внешней системой анализа.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <KnowledgeUploadForm
              disabled={uploadMut.isPending}
              onSubmit={(v) => uploadMut.mutate(v)}
            />
            <Separator />
            {orgQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : orgQuery.isError ? (
              <div className="text-sm text-destructive">Ошибка загрузки.</div>
            ) : orgDocs.length === 0 ? (
              <div className="text-sm text-muted-foreground">Пока нет документов.</div>
            ) : (
              <div className="space-y-2">
                {orgDocs.map((d) => (
                  <div key={d.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{d.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {d.sourceType} • {d.tags.join(", ") || "без тегов"}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const ok = confirm(`Удалить документ “${d.title}”?`);
                          if (!ok) return;
                          deleteMut.mutate(d.id);
                        }}
                        disabled={deleteMut.isPending}
                      >
                        Удалить
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(d.updatedAt).toLocaleString()}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {d.rules?.trim() ? d.rules : "Без правил"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KnowledgeUploadForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (input: { file: File; title: string; sourceType: string; rules?: string; tags?: string[] }) => void;
  disabled?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState("policy");
  const [rules, setRules] = useState("");
  const [tags, setTags] = useState("");

  return (
    <div className="grid gap-3 rounded-lg border border-border p-3">
      <div className="text-sm font-medium">Загрузить документ</div>
      <div className="grid gap-2">
        <Label>Файл</Label>
        <Input type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="grid gap-2">
        <Label>Название</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Тип</Label>
          <Input value={sourceType} onChange={(e) => setSourceType(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Теги</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="оплата, внутреннее" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Правила</Label>
        <Textarea value={rules} onChange={(e) => setRules(e.target.value)} placeholder="Какие правила применять для этого шаблона/документа" />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          disabled={disabled || !file || !title.trim()}
          onClick={() => {
            if (!file) return;
            onSubmit({
              file,
              title: title.trim(),
              sourceType: sourceType.trim() || "other",
              rules: rules.trim() || undefined,
              tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
            });
            setFile(null);
            setTitle("");
            setRules("");
            setTags("");
          }}
        >
          Загрузить
        </Button>
      </div>
    </div>
  );
}
