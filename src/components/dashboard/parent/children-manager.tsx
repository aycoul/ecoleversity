"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  GRADE_LEVELS,
  GRADE_LEVEL_LABELS,
  TARGET_EXAMS,
  TARGET_EXAM_LABELS,
  type GradeLevel,
  type TargetExam,
} from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";

type Child = {
  id: string;
  first_name: string;
  grade_level: GradeLevel;
  target_exam: TargetExam | null;
  avatar_url: string | null;
  birth_year: number | null;
};

type Mode =
  | { kind: "view" }
  | { kind: "add" }
  | { kind: "edit"; childId: string };

type Draft = {
  first_name: string;
  grade_level: GradeLevel | "";
  target_exam: TargetExam | "";
};

const EMPTY_DRAFT: Draft = { first_name: "", grade_level: "", target_exam: "" };

export function ChildrenManager({ initialChildren }: { initialChildren: Child[] }) {
  const t = useTranslations("childrenManager");
  const tc = useTranslations("common");
  const [children, setChildren] = useState<Child[]>(initialChildren);
  const [mode, setMode] = useState<Mode>({ kind: "view" });
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const canSubmit =
    draft.first_name.trim().length > 0 && draft.grade_level !== "";

  const startAdd = () => {
    setDraft(EMPTY_DRAFT);
    setMode({ kind: "add" });
  };

  const startEdit = (child: Child) => {
    setDraft({
      first_name: child.first_name,
      grade_level: child.grade_level,
      target_exam: child.target_exam ?? "",
    });
    setMode({ kind: "edit", childId: child.id });
  };

  const cancel = () => {
    setMode({ kind: "view" });
    setDraft(EMPTY_DRAFT);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(tc("notAuthenticated"));

      if (mode.kind === "add") {
        const { data, error } = await supabase
          .from("learner_profiles")
          .insert({
            parent_id: user.id,
            first_name: draft.first_name.trim(),
            grade_level: draft.grade_level,
            target_exam: draft.target_exam || null,
          })
          .select("id, first_name, grade_level, target_exam, avatar_url, birth_year")
          .single();
        if (error) throw error;
        setChildren((prev) => [
          ...prev,
          {
            id: data.id as string,
            first_name: data.first_name as string,
            grade_level: data.grade_level as GradeLevel,
            target_exam: (data.target_exam as TargetExam | null) ?? null,
            avatar_url: (data.avatar_url as string | null) ?? null,
            birth_year: (data.birth_year as number | null) ?? null,
          },
        ]);
        toast.success(t("added"));
      } else if (mode.kind === "edit") {
        const { error } = await supabase
          .from("learner_profiles")
          .update({
            first_name: draft.first_name.trim(),
            grade_level: draft.grade_level,
            target_exam: draft.target_exam || null,
          })
          .eq("id", mode.childId);
        if (error) throw error;
        setChildren((prev) =>
          prev.map((c) =>
            c.id === mode.childId
              ? {
                  ...c,
                  first_name: draft.first_name.trim(),
                  grade_level: draft.grade_level as GradeLevel,
                  target_exam: (draft.target_exam || null) as TargetExam | null,
                }
              : c
          )
        );
        toast.success(t("saved"));
      }

      cancel();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("error"));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (child: Child) => {
    if (!window.confirm(t("deleteConfirm", { name: child.first_name }))) return;
    setDeleting(child.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("learner_profiles")
        .delete()
        .eq("id", child.id);
      if (error) throw error;
      setChildren((prev) => prev.filter((c) => c.id !== child.id));
      toast.success(t("deleted", { name: child.first_name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("error"));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* List */}
      <div className="space-y-2">
        {children.map((child) => {
          const isEditing = mode.kind === "edit" && mode.childId === child.id;
          if (isEditing) {
            return (
              <ChildFormCard
                key={child.id}
                draft={draft}
                setDraft={setDraft}
                canSubmit={canSubmit}
                submitting={submitting}
                onSubmit={submit}
                onCancel={cancel}
                heading={t("editHeading")}
              />
            );
          }
          return (
            <div
              key={child.id}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ev-green)] text-lg font-bold text-white">
                {child.first_name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900">{child.first_name}</h3>
                <p className="text-xs text-slate-500">
                  {GRADE_LEVEL_LABELS[child.grade_level]}
                  {child.target_exam &&
                    ` · ${TARGET_EXAM_LABELS[child.target_exam]}`}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(child)}
                  disabled={submitting || deleting !== null}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(child)}
                  disabled={submitting || deleting === child.id}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {deleting === child.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add form */}
      {mode.kind === "add" ? (
        <ChildFormCard
          draft={draft}
          setDraft={setDraft}
          canSubmit={canSubmit}
          submitting={submitting}
          onSubmit={submit}
          onCancel={cancel}
          heading={t("addHeading")}
        />
      ) : (
        <Button
          variant="outline"
          onClick={startAdd}
          disabled={submitting || deleting !== null}
          className="w-full border-dashed"
        >
          <Plus className="mr-2 size-4" />
          {t("addButton")}
        </Button>
      )}
    </div>
  );
}

type ChildFormCardProps = {
  draft: Draft;
  setDraft: (d: Draft) => void;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  heading: string;
};

function ChildFormCard({
  draft,
  setDraft,
  canSubmit,
  submitting,
  onSubmit,
  onCancel,
  heading,
}: ChildFormCardProps) {
  const t = useTranslations("childrenManager");
  return (
    <div className="space-y-3 rounded-xl border border-[var(--ev-blue)]/20 bg-[var(--ev-blue-50)]/30 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{heading}</h3>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="child-name">{t("firstNameLabel")}</Label>
        <Input
          id="child-name"
          value={draft.first_name}
          onChange={(e) => setDraft({ ...draft, first_name: e.target.value })}
          placeholder={t("firstNamePlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("gradeLevelLabel")}</Label>
        <Select
          value={draft.grade_level}
          onValueChange={(val) =>
            setDraft({ ...draft, grade_level: val as GradeLevel })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("gradeLevelPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {GRADE_LEVELS.map((grade) => (
              <SelectItem key={grade} value={grade}>
                {GRADE_LEVEL_LABELS[grade]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t("targetExamLabel")}</Label>
        <Select
          value={draft.target_exam}
          onValueChange={(val) =>
            setDraft({ ...draft, target_exam: val as TargetExam })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("targetExamPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {TARGET_EXAMS.map((exam) => (
              <SelectItem key={exam} value={exam}>
                {TARGET_EXAM_LABELS[exam]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={onSubmit}
        disabled={!canSubmit || submitting}
        className="w-full bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]"
      >
        {submitting ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Save className="mr-2 size-4" />
        )}
        {t("save")}
      </Button>
    </div>
  );
}
