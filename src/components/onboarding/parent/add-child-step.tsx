"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  GRADE_LEVELS,
  GRADE_LEVEL_LABELS,
  TARGET_EXAMS,
  TARGET_EXAM_LABELS,
} from "@/types/domain";
import type { GradeLevel, TargetExam } from "@/types/domain";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";

export type ChildProfile = {
  id: string;
  first_name: string;
  grade_level: GradeLevel;
  target_exam: TargetExam | null;
};

type AddChildStepProps = {
  children: ChildProfile[];
  onChildAdded: (child: ChildProfile) => void;
  onChildRemoved: (childId: string) => void;
};

export function AddChildStep({ children, onChildAdded, onChildRemoved }: AddChildStepProps) {
  const t = useTranslations("onboarding.parent");

  const [firstName, setFirstName] = useState("");
  const [gradeLevel, setGradeLevel] = useState<GradeLevel | "">("");
  const [targetExam, setTargetExam] = useState<TargetExam | "">("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const canAdd = firstName.trim() !== "" && gradeLevel !== "";

  const addChild = async () => {
    if (!canAdd) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("learner_profiles")
        .insert({
          parent_id: user.id,
          first_name: firstName.trim(),
          grade_level: gradeLevel,
          target_exam: targetExam || null,
        })
        .select("id, first_name, grade_level, target_exam")
        .single();

      if (error) throw error;

      onChildAdded(data as ChildProfile);
      toast.success(t("childAdded"));

      // Reset form
      setFirstName("");
      setGradeLevel("");
      setTargetExam("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const removeChild = async (childId: string) => {
    setDeleting(childId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("learner_profiles")
        .delete()
        .eq("id", childId);

      if (error) throw error;

      onChildRemoved(childId);
      toast.success(t("childRemoved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t("addChildTitle")}</h2>
        <p className="text-sm text-slate-500">{t("addChildDesc")}</p>
      </div>

      {/* List of already-added children */}
      {children.length > 0 && (
        <div className="space-y-2">
          {children.map((child) => (
            <div
              key={child.id}
              className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-emerald-200 text-sm font-bold text-emerald-700">
                  {child.first_name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-900">{child.first_name}</p>
                  <p className="text-xs text-emerald-600">
                    {GRADE_LEVEL_LABELS[child.grade_level]}
                    {child.target_exam && ` — ${TARGET_EXAM_LABELS[child.target_exam]}`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeChild(child.id)}
                disabled={deleting === child.id}
                className="text-red-500 hover:bg-red-50 hover:text-red-700"
              >
                {deleting === child.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                <span className="sr-only">{t("removeChild")}</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add child form */}
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <UserPlus className="size-4" />
          {children.length > 0 ? t("addAnother") : t("addChildTitle")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="child-name">{t("childName")}</Label>
          <Input
            id="child-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Aya, Kouamé, Fatou..."
          />
        </div>

        <div className="space-y-2">
          <Label>{t("childGrade")}</Label>
          <Select value={gradeLevel} onValueChange={(val) => setGradeLevel(val as GradeLevel)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir une classe" />
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
          <Label>{t("childExam")}</Label>
          <Select value={targetExam} onValueChange={(val) => setTargetExam(val as TargetExam)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Aucun" />
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
          onClick={addChild}
          disabled={!canAdd || saving}
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Plus className="mr-2 size-4" />
          )}
          {t("addChild")}
        </Button>
      </div>

      {children.length === 0 && (
        <p className="text-center text-sm text-slate-400">{t("childRequired")}</p>
      )}
    </div>
  );
}
