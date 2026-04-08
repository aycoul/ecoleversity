"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS, TARGET_EXAM_LABELS } from "@/types/domain";
import type { Subject, GradeLevel, TargetExam } from "@/types/domain";
import { Loader2, CheckCircle, Upload, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type CourseFormProps = {
  subjects: string[];
  gradeLevels: string[];
  courseId?: string;
  initialData?: {
    title: string;
    description: string;
    subject: string;
    gradeLevel: string;
    examType: string | null;
    language: string;
    priceXof: number;
    thumbnailUrl: string | null;
    status: string;
  };
};

export function CourseForm({ subjects, gradeLevels, courseId, initialData }: CourseFormProps) {
  const t = useTranslations("course");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const isEdit = !!courseId;

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [subject, setSubject] = useState(initialData?.subject ?? subjects[0] ?? "");
  const [gradeLevel, setGradeLevel] = useState(initialData?.gradeLevel ?? gradeLevels[0] ?? "");
  const [examType, setExamType] = useState(initialData?.examType ?? "");
  const [language, setLanguage] = useState(initialData?.language ?? "fr");
  const [priceXof, setPriceXof] = useState(initialData?.priceXof ?? 5000);
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnailUrl ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleThumbnailUpload(file: File) {
    setIsUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `course-thumbnails/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("course-assets")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        console.error("Thumbnail upload error:", uploadError);
        setError("Erreur lors du telechargement de l'image");
        return;
      }

      const { data: urlData } = supabase.storage
        .from("course-assets")
        .getPublicUrl(path);

      setThumbnailUrl(urlData.publicUrl);
    } catch {
      setError("Erreur lors du telechargement");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title,
        description: description || undefined,
        subject,
        gradeLevel,
        examType: examType || undefined,
        language,
        priceXof,
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
      };

      const url = isEdit ? `/api/courses/${courseId}` : "/api/courses/create";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? tCommon("error"));
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);

      if (!isEdit) {
        // Redirect to edit page to add lessons
        setTimeout(() => {
          router.push(`/dashboard/teacher/courses/${data.course.id}`);
        }, 800);
      } else {
        setTimeout(() => setSuccess(false), 2000);
        setIsSubmitting(false);
      }
    } catch {
      setError(tCommon("error"));
      setIsSubmitting(false);
    }
  }

  if (success && !isEdit) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="mb-4 size-12 text-emerald-500" />
        <p className="text-lg font-semibold text-emerald-700">{t("created")}</p>
      </div>
    );
  }

  const selectClass =
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  const examOptions: TargetExam[] = ["CEPE", "BEPC", "BAC", "CONCOURS_6EME"];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {t("updated")}
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">{t("courseName")}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Mathematiques 3eme — Equations"
          required
          minLength={3}
          maxLength={200}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={5000}
        />
      </div>

      {/* Subject + Grade row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="subject">{t("subject")}</Label>
          <select
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={selectClass}
            required
          >
            {subjects.map((s) => (
              <option key={s} value={s}>
                {SUBJECT_LABELS[s as Subject] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gradeLevel">{t("gradeLevel")}</Label>
          <select
            id="gradeLevel"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className={selectClass}
            required
          >
            {gradeLevels.map((g) => (
              <option key={g} value={g}>
                {GRADE_LEVEL_LABELS[g as GradeLevel] ?? g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exam + Language row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="examType">{t("targetExam")}</Label>
          <select
            id="examType"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className={selectClass}
          >
            <option value="">--</option>
            {examOptions.map((ex) => (
              <option key={ex} value={ex}>
                {TARGET_EXAM_LABELS[ex]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">{t("language")}</Label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={selectClass}
          >
            <option value="fr">{t("french")}</option>
            <option value="en">{t("english")}</option>
          </select>
        </div>
      </div>

      {/* Price */}
      <div className="space-y-2">
        <Label htmlFor="priceXof">{t("price")}</Label>
        <Input
          id="priceXof"
          type="number"
          min={0}
          step={500}
          value={priceXof}
          onChange={(e) => setPriceXof(Number(e.target.value))}
          required
        />
      </div>

      {/* Thumbnail */}
      <div className="space-y-2">
        <Label>{t("thumbnail")}</Label>
        <div className="flex items-center gap-4">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Thumbnail"
              className="size-20 rounded-lg border object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
              <ImageIcon className="size-8 text-slate-300" />
            </div>
          )}
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleThumbnailUpload(file);
              }}
            />
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
              {isUploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {isUploading ? t("uploading") : t("thumbnail")}
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || isUploading}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {isEdit ? tCommon("save") : t("saveDraft")}
      </Button>
    </form>
  );
}
