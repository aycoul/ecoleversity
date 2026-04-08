"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Loader2, Globe, Archive, Trash2 } from "lucide-react";

type CourseActionsProps = {
  courseId: string;
  currentStatus: string;
  hasLessonsWithVideo: boolean;
};

export function CourseActions({
  courseId,
  currentStatus,
  hasLessonsWithVideo,
}: CourseActionsProps) {
  const t = useTranslations("course");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [isPublishing, setIsPublishing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function updateStatus(status: "published" | "archived") {
    const setter = status === "published" ? setIsPublishing : setIsArchiving;
    setter(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? tCommon("error"));
        setter(false);
        return;
      }

      setSuccess(t("updated"));
      // Refresh the page to reflect new status
      setTimeout(() => router.refresh(), 800);
    } catch {
      setError(tCommon("error"));
    } finally {
      setter(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t("confirmDelete"))) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? tCommon("error"));
        setIsDeleting(false);
        return;
      }

      router.push("/dashboard/teacher/courses");
    } catch {
      setError(tCommon("error"));
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">{t("status")}</h2>

      <p className="text-sm text-slate-500">
        {currentStatus === "draft" && t("draft")}
        {currentStatus === "published" && t("published")}
        {currentStatus === "archived" && t("archived")}
      </p>

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {currentStatus !== "published" && (
          <Button
            onClick={() => updateStatus("published")}
            disabled={isPublishing || !hasLessonsWithVideo}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {isPublishing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Globe className="size-4" />
            )}
            {t("publish")}
          </Button>
        )}

        {!hasLessonsWithVideo && currentStatus !== "published" && (
          <p className="self-center text-xs text-amber-600">{t("publishError")}</p>
        )}

        {currentStatus === "published" && (
          <Button
            onClick={() => updateStatus("archived")}
            disabled={isArchiving}
            variant="outline"
            className="gap-2"
          >
            {isArchiving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Archive className="size-4" />
            )}
            {t("archive")}
          </Button>
        )}

        {currentStatus === "archived" && (
          <Button
            onClick={() => updateStatus("published")}
            disabled={isPublishing}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {isPublishing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Globe className="size-4" />
            )}
            {t("publish")}
          </Button>
        )}

        <Button
          onClick={handleDelete}
          disabled={isDeleting}
          variant="outline"
          className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          {isDeleting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          {t("deleteCourse")}
        </Button>
      </div>
    </div>
  );
}
