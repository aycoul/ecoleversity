"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  SUBJECTS,
  SUBJECT_LABELS,
  GRADE_LEVELS,
  GRADE_LEVEL_LABELS,
  GRADE_GROUPS,
  IVORIAN_CITIES,
} from "@/types/domain";
import type { Subject, GradeLevel, IvorianCity } from "@/types/domain";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Camera } from "lucide-react";

type ProfileStepProps = {
  onSaved: () => void;
};

export function ProfileStep({ onSaved }: ProfileStepProps) {
  const t = useTranslations("onboarding.teacher");

  const [bio, setBio] = useState("");
  const [city, setCity] = useState<IvorianCity | "">("");
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<GradeLevel[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleSubject = (subject: Subject) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const toggleGrade = (grade: GradeLevel) => {
    setSelectedGrades((prev) =>
      prev.includes(grade)
        ? prev.filter((g) => g !== grade)
        : [...prev, grade]
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    if (!bio.trim() || !city || selectedSubjects.length === 0 || selectedGrades.length === 0) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      let avatarUrl: string | null = null;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `avatars/${user.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("teacher-documents")
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("teacher-documents")
          .getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          bio,
          city,
          ...(avatarUrl && { avatar_url: avatarUrl }),
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const { error: teacherError } = await supabase
        .from("teacher_profiles")
        .upsert({
          user_id: user.id,
          subjects: selectedSubjects,
          grade_levels: selectedGrades,
        });
      if (teacherError) throw teacherError;

      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t("profileTitle")}</h2>
        <p className="text-sm text-slate-500">{t("profileDesc")}</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <label
          htmlFor="avatar-upload"
          className="flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-emerald-400"
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="size-full object-cover" />
          ) : (
            <Camera className="size-6 text-slate-400" />
          )}
        </label>
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
        <span className="text-sm text-slate-500">Photo de profil (optionnel)</span>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">{t("bio")}</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Enseignant de math&eacute;matiques avec 5 ans d'exp&eacute;rience..."
          rows={3}
        />
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label>{t("city")}</Label>
        <Select value={city} onValueChange={(val) => setCity(val as IvorianCity)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choisir une ville" />
          </SelectTrigger>
          <SelectContent>
            {IVORIAN_CITIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subjects */}
      <div className="space-y-2">
        <Label>{t("subjects")}</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SUBJECTS.map((subject) => (
            <label
              key={subject}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors ${
                selectedSubjects.includes(subject)
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedSubjects.includes(subject)}
                onChange={() => toggleSubject(subject)}
                className="sr-only"
              />
              <span
                className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                  selectedSubjects.includes(subject)
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300"
                }`}
              >
                {selectedSubjects.includes(subject) && (
                  <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {SUBJECT_LABELS[subject]}
            </label>
          ))}
        </div>
      </div>

      {/* Grade Levels */}
      <div className="space-y-3">
        <Label>{t("gradeLevels")}</Label>
        {(Object.entries(GRADE_GROUPS) as [string, readonly GradeLevel[]][]).map(
          ([group, grades]) => (
            <div key={group}>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                {group === "primaire" ? "Primaire" : group === "college" ? "Coll\u00e8ge" : "Lyc\u00e9e"}
              </p>
              <div className="flex flex-wrap gap-2">
                {grades.map((grade) => (
                  <label
                    key={grade}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      selectedGrades.includes(grade)
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGrades.includes(grade)}
                      onChange={() => toggleGrade(grade)}
                      className="sr-only"
                    />
                    {GRADE_LEVEL_LABELS[grade]}
                  </label>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Save button */}
      <Button
        onClick={save}
        disabled={saving || !bio.trim() || !city || selectedSubjects.length === 0 || selectedGrades.length === 0}
        className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
        Enregistrer et continuer
      </Button>
    </div>
  );
}
