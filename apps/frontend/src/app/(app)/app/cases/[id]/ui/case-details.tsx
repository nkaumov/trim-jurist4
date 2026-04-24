"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  analyzeCase,
  createDisagreementItem,
  deleteCaseFile,
  deleteDisagreementItem,
  deleteOrgKnowledgeDoc,
  getAnalysisPositions,
  getAnalysisRun,
  getCase,
  listAnalysisRuns,
  listCaseFiles,
  listOrgKnowledge,
  uploadCaseFile,
  uploadOrgKnowledge,
  upsertDisagreementInput,
} from "@/features/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function RiskBadge({ risk }: { risk: string }) {
  const variant = risk === "high" ? "danger" : "default";
  return <Badge variant={variant as any}>{risk}</Badge>;
}

export function CaseDetailsTabs({ caseId }: { caseId: string }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");

  const caseQuery = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => getCase(caseId),
  });

  const filesQuery = useQuery({
    queryKey: ["case_files", caseId],
    queryFn: () => listCaseFiles(caseId),
  });
  const files = filesQuery.data ?? [];

  const analysisRunsQuery = useQuery({
    queryKey: ["analysis_runs", caseId],
    queryFn: () => listAnalysisRuns(caseId),
  });

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const selectedRun = useQuery({
    queryKey: ["analysis_run", selectedRunId],
    queryFn: () => getAnalysisRun(selectedRunId!),
    enabled: Boolean(selectedRunId),
  });
  const positionsQuery = useQuery({
    queryKey: ["analysis_positions", selectedRunId],
    queryFn: () => getAnalysisPositions(selectedRunId!),
    enabled: Boolean(selectedRunId),
  });

  const orgKnowledgeQuery = useQuery({ queryKey: ["org_knowledge"], queryFn: listOrgKnowledge });
  const orgDocs = orgKnowledgeQuery.data ?? [];

  const upsertDisagreement = useMutation({
    mutationFn: (input: { inputType: string; freeText?: string | null }) =>
      upsertDisagreementInput(caseId, input),
    onSuccess: async () => {
      toast.success("Сохранено");
      await qc.invalidateQueries({ queryKey: ["case", caseId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Ошибка"),
  });

  const analyzeMut = useMutation({
    mutationFn: () => analyzeCase(caseId),
    onSuccess: async () => {
      toast.success("Дело поставлено в очередь анализа");
      await qc.invalidateQueries({ queryKey: ["analysis_runs", caseId] });
      await qc.invalidateQueries({ queryKey: ["case", caseId] });
      setTab("analysis");
    },
    onError: (e: any) => toast.error(e?.message ?? "Ошибка запуска анализа"),
  });

  const uploadFileMut = useMutation({
    mutationFn: (input: { file: File; fileCategory: string }) => uploadCaseFile(caseId, input),
    onSuccess: async () => {
      toast.success("Файл загружен");
      await qc.invalidateQueries({ queryKey: ["case_files", caseId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Ошибка загрузки"),
  });

  const deleteFileMut = useMutation({
    mutationFn: (fileId: string) => deleteCaseFile(fileId),
    onSuccess: async () => {
      toast.success("Файл удален");
      await qc.invalidateQueries({ queryKey: ["case_files", caseId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Ошибка удаления"),
  });

  const addManualItemMut = useMutation({
    mutationFn: (input: { disagreementInputId: string; item: any }) =>
      createDisagreementItem(input.disagreementInputId, input.item),
    onSuccess: async () => {
      toast.success("Позиция добавлена");
      await qc.invalidateQueries({ queryKey: ["case", caseId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Ошибка"),
  });

  const deleteManualItemMut = useMutation({
    mutationFn: (itemId: string) => deleteDisagreementItem(itemId),
    onSuccess: async () => {
      toast.success("Удалено");
      await qc.invalidateQueries({ queryKey: ["case", caseId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Ошибка"),
  });

  const uploadKnowledgeMut = useMutation({
    mutationFn: (input: { file: File; title: string; sourceType: string; rules?: string; tags?: string[] }) =>
      uploadOrgKnowledge(input),
    onSuccess: async () => {
      toast.success("Документ добавлен");
      await qc.invalidateQueries({ queryKey: ["org_knowledge"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Ошибка загрузки"),
  });

  const deleteKnowledgeMut = useMutation({
    mutationFn: deleteOrgKnowledgeDoc,
    onSuccess: async () => {
      toast.success("Удалено");
      await qc.invalidateQueries({ queryKey: ["org_knowledge"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Ошибка удаления"),
  });

  const runs = analysisRunsQuery.data ?? [];
  const effectiveRunId = selectedRunId ?? runs[0]?.id ?? null;

  useEffect(() => {
    if (!selectedRunId && runs.length > 0) setSelectedRunId(runs[0]!.id);
  }, [runs, selectedRunId]);

  if (caseQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (caseQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ошибка</CardTitle>
          <CardDescription>Не удалось загрузить дело.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const c = caseQuery.data;
  if (!c) return null;

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{c.title}</h1>
          <p className="text-sm text-muted-foreground">
            {c.counterpartyName} • {c.status} • {c.priority}
          </p>
        </div>
        <Button onClick={() => analyzeMut.mutate()} disabled={analyzeMut.isPending}>
          {analyzeMut.isPending ? "Отправляем..." : "Отправить на анализ"}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="disagreements">Disagreements</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
              <CardDescription>Ключевые поля дела.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Статус</div>
                <div className="text-sm font-medium">{c.status}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Тип договора</div>
                <div className="text-sm font-medium">{c.contractType ?? "—"}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground">Заметки</div>
                <div className="text-sm whitespace-pre-wrap">{c.notes ?? "—"}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Документы</CardTitle>
              <CardDescription>Загрузка и список файлов по делу.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Label>Файл</Label>
                  <Input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      uploadFileMut.mutate({ file: f, fileCategory: "appendix" });
                      e.target.value = "";
                    }}
                  />
                </div>
                <div>
                  <Label>Категория</Label>
                  <div className="text-sm text-muted-foreground mt-2">
                    Сейчас: <span className="font-medium">appendix</span>
                  </div>
                </div>
              </div>

              <Separator />

              {filesQuery.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : filesQuery.isError ? (
                <div className="text-sm text-destructive">Ошибка загрузки файлов.</div>
              ) : files.length === 0 ? (
                <div className="text-sm text-muted-foreground">Файлов пока нет.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Размер</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.originalName}</TableCell>
                        <TableCell>{f.fileCategory}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{f.mimeType}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {Math.ceil(f.fileSize / 1024)} KB
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteFileMut.mutate(f.id)}
                            disabled={deleteFileMut.isPending}
                          >
                            Удалить
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disagreements">
          <Card>
            <CardHeader>
              <CardTitle>Разногласия</CardTitle>
              <CardDescription>
                Выберите способ ввода: документ, свободный текст или ручные позиции.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { v: "document", l: "Документ" },
                  { v: "free_text", l: "Свободный текст" },
                  { v: "manual_items", l: "Ручные позиции" },
                ].map((x) => (
                  <Button
                    key={x.v}
                    variant={c.disagreementInput?.inputType === x.v ? "default" : "outline"}
                    onClick={() => upsertDisagreement.mutate({ inputType: x.v, freeText: c.disagreementInput?.freeText ?? null })}
                    disabled={upsertDisagreement.isPending}
                  >
                    {x.l}
                  </Button>
                ))}
              </div>

              {c.disagreementInput?.inputType === "document" ? (
                <div className="grid gap-2">
                  <div className="text-sm font-medium">Загрузить документ разногласий</div>
                  <Input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      uploadFileMut.mutate({ file: f, fileCategory: "disagreement_document" });
                      e.target.value = "";
                    }}
                  />
                  <div className="text-xs text-muted-foreground">
                    Файл сохраняется в `case_files` с категорией disagreement_document.
                  </div>
                </div>
              ) : null}

              {c.disagreementInput?.inputType === "free_text" ? (
                <div className="grid gap-2">
                  <Label>Текст пожеланий / замечаний</Label>
                  <Textarea
                    defaultValue={c.disagreementInput?.freeText ?? ""}
                    onBlur={(e) =>
                      upsertDisagreement.mutate({
                        inputType: "free_text",
                        freeText: e.target.value || null,
                      })
                    }
                    placeholder="Введите свободный текст…"
                  />
                  <div className="text-xs text-muted-foreground">Сохраняется при уходе из поля.</div>
                </div>
              ) : null}

              {c.disagreementInput?.inputType === "manual_items" ? (
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Позиции</div>
                    <AddManualItemDialog
                      disabled={addManualItemMut.isPending}
                      onSubmit={(item) =>
                        addManualItemMut.mutate({
                          disagreementInputId: c.disagreementInput!.id,
                          item,
                        })
                      }
                    />
                  </div>

                  {c.disagreementInput.items.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Пока нет позиций.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Пункт</TableHead>
                          <TableHead>Наша версия</TableHead>
                          <TableHead>Версия контрагента</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {c.disagreementInput.items.map((it) => (
                          <TableRow key={it.id}>
                            <TableCell className="font-medium">
                              {it.clauseNumber ?? "—"} {it.clauseTitle ? `• ${it.clauseTitle}` : ""}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {it.ourVersion ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {it.counterpartyVersion ?? "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteManualItemMut.mutate(it.id)}
                                disabled={deleteManualItemMut.isPending}
                              >
                                Удалить
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>База знаний организации</CardTitle>
                <CardDescription>Документы, доступные внешней системе анализа.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <UploadKnowledgeForm
                  disabled={uploadKnowledgeMut.isPending}
                  onSubmit={(v) => uploadKnowledgeMut.mutate(v)}
                />

                <Separator />

                {orgKnowledgeQuery.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : orgKnowledgeQuery.isError ? (
                  <div className="text-sm text-destructive">Ошибка загрузки.</div>
                ) : orgDocs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Пока нет документов.</div>
                ) : (
                  <div className="space-y-2">
                    {orgDocs.map((d) => (
                      <div key={d.id} className="rounded-lg border border-border p-3">
                        <div className="font-medium">{d.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {d.sourceType} • {d.tags.join(", ") || "без тегов"}
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
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>Запуски анализа</CardTitle>
              <CardDescription>Результат приходит через интеграцию по API и сохраняется как запуск анализа.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {analysisRunsQuery.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : analysisRunsQuery.isError ? (
                <div className="text-sm text-destructive">Ошибка загрузки.</div>
              ) : runs.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Анализов пока нет. Нажмите «Запустить анализ».
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {runs.map((r) => (
                      <Button
                        key={r.id}
                        size="sm"
                        variant={effectiveRunId === r.id ? "default" : "outline"}
                        onClick={() => setSelectedRunId(r.id)}
                      >
                        {new Date(r.createdAt).toLocaleString("ru-RU")} • {r.status}
                      </Button>
                    ))}
                  </div>

                  {selectedRun.isLoading || positionsQuery.isLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : selectedRun.isError || positionsQuery.isError ? (
                    <div className="text-sm text-destructive">Ошибка получения результата.</div>
                  ) : (
                    <div className="grid gap-4">
                      <Card className="border-dashed">
                        <CardHeader>
                          <CardTitle>Summary</CardTitle>
                          <CardDescription>Короткое резюме</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm whitespace-pre-wrap">
                          {selectedRun.data.summary ?? "—"}
                        </CardContent>
                      </Card>

                      <Card className="border-dashed">
                        <CardHeader>
                          <CardTitle>Final recommendation</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm whitespace-pre-wrap">
                          {selectedRun.data.finalRecommendation ?? "—"}
                        </CardContent>
                      </Card>

                      <Card className="border-dashed">
                        <CardHeader>
                          <CardTitle>Draft protocol</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm whitespace-pre-wrap">
                          {selectedRun.data.draftProtocolText ?? "—"}
                        </CardContent>
                      </Card>

                      <div className="grid gap-3">
                        <div className="text-sm font-medium">Спорные пункты</div>
                        {positionsQuery.data.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Нет позиций.</div>
                        ) : (
                          positionsQuery.data.map((p: any) => (
                            <Card key={p.id}>
                              <CardHeader>
                                <div className="flex items-center justify-between gap-4">
                                  <div className="min-w-0">
                                    <CardTitle className="truncate">
                                      {p.clauseNumber ?? "—"} • {p.clauseTitle}
                                    </CardTitle>
                                    <CardDescription className="truncate">
                                      Рекомендация: {p.recommendation}
                                    </CardDescription>
                                  </div>
                                  <RiskBadge risk={p.riskLevel} />
                                </div>
                              </CardHeader>
                              <CardContent className="grid gap-3 text-sm">
                                <div className="grid gap-1">
                                  <div className="text-xs text-muted-foreground">Комментарий ИИ</div>
                                  <div className="whitespace-pre-wrap">{p.aiComment}</div>
                                </div>
                                <div className="grid gap-1 md:grid-cols-2">
                                  <div className="grid gap-1">
                                    <div className="text-xs text-muted-foreground">Наша версия</div>
                                    <div className="whitespace-pre-wrap">{p.ourVersion ?? "—"}</div>
                                  </div>
                                  <div className="grid gap-1">
                                    <div className="text-xs text-muted-foreground">Версия контрагента</div>
                                    <div className="whitespace-pre-wrap">{p.counterpartyVersion ?? "—"}</div>
                                  </div>
                                </div>
                                <div className="grid gap-1">
                                  <div className="text-xs text-muted-foreground">Основания</div>
                                  <ul className="list-disc pl-5">
                                    {(p.bases ?? []).map((b: any) => (
                                      <li key={b.id}>
                                        {b.basisType} • {b.sourceTitle}
                                        {b.sourceReference ? ` (${b.sourceReference})` : ""}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>История</CardTitle>
              <CardDescription>История статусов и аудит (MVP-заглушка).</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              В следующей итерации добавим API для `case_status_history` и `audit_logs` и отрисуем здесь.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddManualItemDialog({
  onSubmit,
  disabled,
}: {
  onSubmit: (item: any) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [clauseNumber, setClauseNumber] = useState("");
  const [clauseTitle, setClauseTitle] = useState("");
  const [ourVersion, setOurVersion] = useState("");
  const [counterpartyVersion, setCounterpartyVersion] = useState("");
  const [clientRequest, setClientRequest] = useState("");
  const [comment, setComment] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          Добавить
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая позиция</DialogTitle>
          <DialogDescription>Ручной ввод позиции разногласия.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Пункт</Label>
            <div className="grid gap-2 md:grid-cols-2">
              <Input value={clauseNumber} onChange={(e) => setClauseNumber(e.target.value)} placeholder="Напр. 4.2" />
              <Input value={clauseTitle} onChange={(e) => setClauseTitle(e.target.value)} placeholder="Название пункта" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Наша версия</Label>
            <Textarea value={ourVersion} onChange={(e) => setOurVersion(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Версия контрагента</Label>
            <Textarea value={counterpartyVersion} onChange={(e) => setCounterpartyVersion(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Пожелание клиента</Label>
            <Textarea value={clientRequest} onChange={(e) => setClientRequest(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Комментарий</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              type="button"
            >
              Отмена
            </Button>
            <Button
              onClick={() => {
                onSubmit({
                  clauseNumber: clauseNumber || null,
                  clauseTitle: clauseTitle || null,
                  ourVersion: ourVersion || null,
                  counterpartyVersion: counterpartyVersion || null,
                  clientRequest: clientRequest || null,
                  comment: comment || null,
                  sortOrder: 0,
                });
                setOpen(false);
                setClauseNumber("");
                setClauseTitle("");
                setOurVersion("");
                setCounterpartyVersion("");
                setClientRequest("");
                setComment("");
              }}
              disabled={disabled}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UploadKnowledgeForm({
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
        <Input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <div className="grid gap-2">
        <Label>Название</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Тип источника</Label>
          <Input value={sourceType} onChange={(e) => setSourceType(e.target.value)} placeholder="policy/template/..." />
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
          disabled={disabled || !file || !title.trim()}
          onClick={() => {
            if (!file) return;
            onSubmit({
              file,
              title: title.trim(),
              sourceType: sourceType.trim() || "other",
              rules: rules.trim() || undefined,
              tags: tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            });
            setFile(null);
            setTitle("");
            setRules("");
            setTags("");
          }}
          type="button"
        >
          Загрузить
        </Button>
      </div>
    </div>
  );
}
