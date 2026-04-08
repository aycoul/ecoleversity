"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Video,
  FileText,
  Eye,
  Pencil,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Lesson = {
  id: string;
  title: string;
  video_url: string | null;
  video_duration_seconds: number;
  pdf_attachment_url: string | null;
  is_preview: boolean;
  sort_order: number;
};

type LessonManagerProps = {
  courseId: string;
  initialLessons: Lesson[];
};

export function LessonManager({ courseId, initialLessons }: LessonManagerProps) {
  const t = useTranslations("course");
  const tCommon = useTranslations("common");

  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formIsPreview, setFormIsPreview] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setFormTitle("");
    setFormIsPreview(false);
    setVideoFile(null);
    setPdfFile(null);
    setUploadProgress(0);
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  function startEdit(lesson: Lesson) {
    setEditingId(lesson.id);
    setFormTitle(lesson.title);
    setFormIsPreview(lesson.is_preview);
    setVideoFile(null);
    setPdfFile(null);
    setShowForm(true);
  }

  async function uploadFile(file: File, folder: string): Promise<string | null> {
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    // Simulate progress since supabase-js doesn't provide upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 8, 90));
    }, 300);

    const { error: uploadError } = await supabase.storage
      .from("course-assets")
      .upload(path, file, { contentType: file.type });

    clearInterval(progressInterval);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    setUploadProgress(100);

    const { data: urlData } = supabase.storage
      .from("course-assets")
      .getPublicUrl(path);

    return urlData.publicUrl;
  }

  async function handleSubmitLesson(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setUploadProgress(0);

    try {
      let videoUrl: string | undefined;
      let videoDurationSeconds = 0;
      let pdfUrl: string | undefined;

      // Upload video if selected
      if (videoFile) {
        const url = await uploadFile(videoFile, "course-videos");
        if (!url) {
          setError("Erreur lors du telechargement de la video");
          setIsSubmitting(false);
          return;
        }
        videoUrl = url;
        // Attempt to get duration from the video file
        videoDurationSeconds = await getVideoDuration(videoFile);
      }

      // Upload PDF if selected
      if (pdfFile) {
        setUploadProgress(0);
        const url = await uploadFile(pdfFile, "course-pdfs");
        if (!url) {
          setError("Erreur lors du telechargement du PDF");
          setIsSubmitting(false);
          return;
        }
        pdfUrl = url;
      }

      if (editingId) {
        // Update existing lesson
        const payload: Record<string, unknown> = {
          lessonId: editingId,
          title: formTitle,
          isPreview: formIsPreview,
        };
        if (videoUrl) {
          payload.videoUrl = videoUrl;
          payload.videoDurationSeconds = videoDurationSeconds;
        }
        if (pdfUrl) {
          payload.pdfAttachmentUrl = pdfUrl;
        }

        const res = await fetch("/api/lessons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? tCommon("error"));
          setIsSubmitting(false);
          return;
        }

        setLessons((prev) =>
          prev.map((l) => (l.id === editingId ? data.lesson : l))
        );
      } else {
        // Create new lesson
        const res = await fetch("/api/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            title: formTitle,
            isPreview: formIsPreview,
            ...(videoUrl ? { videoUrl, videoDurationSeconds } : {}),
            ...(pdfUrl ? { pdfAttachmentUrl: pdfUrl } : {}),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? tCommon("error"));
          setIsSubmitting(false);
          return;
        }

        setLessons((prev) => [...prev, data.lesson]);
      }

      resetForm();
    } catch {
      setError(tCommon("error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(lessonId: string) {
    if (!confirm(t("confirmDelete"))) return;

    try {
      const res = await fetch("/api/lessons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });

      if (res.ok) {
        setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      }
    } catch {
      console.error("Delete error");
    }
  }

  const moveLesson = useCallback(
    async (index: number, direction: "up" | "down") => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= lessons.length) return;

      const reordered = [...lessons];
      [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
      setLessons(reordered);

      // Persist the new order
      try {
        await fetch("/api/lessons/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            lessonIds: reordered.map((l) => l.id),
          }),
        });
      } catch {
        // Revert on error
        setLessons(lessons);
      }
    },
    [lessons, courseId]
  );

  function formatDuration(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">{t("lessons")}</h2>
        {!showForm && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="size-4" />
            {t("addLesson")}
          </Button>
        )}
      </div>

      {/* Lesson list */}
      {lessons.length === 0 && !showForm && (
        <p className="rounded-lg border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
          {t("noLessons")}
        </p>
      )}

      <div className="space-y-2">
        {lessons.map((lesson, index) => (
          <div
            key={lesson.id}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => moveLesson(index, "up")}
                disabled={index === 0}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
              >
                <ChevronUp className="size-4" />
              </button>
              <GripVertical className="size-4 text-slate-300" />
              <button
                type="button"
                onClick={() => moveLesson(index, "down")}
                disabled={index === lessons.length - 1}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
              >
                <ChevronDown className="size-4" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  {index + 1}.
                </span>
                <h3 className="font-medium text-slate-800 truncate">
                  {lesson.title}
                </h3>
                {lesson.is_preview && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    <Eye className="size-3" />
                    Preview
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                {lesson.video_url && (
                  <span className="inline-flex items-center gap-1">
                    <Video className="size-3" />
                    {formatDuration(lesson.video_duration_seconds)}
                  </span>
                )}
                {lesson.pdf_attachment_url && (
                  <span className="inline-flex items-center gap-1">
                    <FileText className="size-3" />
                    PDF
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => startEdit(lesson)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(lesson.id)}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmitLesson}
          className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
        >
          <h3 className="font-medium text-slate-800">
            {editingId ? t("editLesson") : t("addLesson")}
          </h3>

          <div className="space-y-2">
            <Label htmlFor="lessonTitle">{t("lessonTitle")}</Label>
            <Input
              id="lessonTitle"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Introduction au chapitre..."
              required
              minLength={1}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("uploadVideo")}</Label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                />
                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
                  <Video className="size-4" />
                  {t("uploadVideo")}
                </span>
              </label>
              {videoFile && (
                <span className="text-sm text-slate-600">
                  {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("uploadPdf")}</Label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                />
                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
                  <FileText className="size-4" />
                  {t("uploadPdf")}
                </span>
              </label>
              {pdfFile && (
                <span className="text-sm text-slate-600">{pdfFile.name}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPreview"
              checked={formIsPreview}
              onChange={(e) => setFormIsPreview(e.target.checked)}
              className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <Label htmlFor="isPreview" className="cursor-pointer">
              {t("isPreview")}
            </Label>
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">
                {t("uploading")} {t("uploadProgress", { percent: uploadProgress })}
              </p>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t("saveLesson")}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              {tCommon("cancel")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Read video duration from file using a temporary video element */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration));
    };
    video.onerror = () => resolve(0);
    video.src = URL.createObjectURL(file);
  });
}
