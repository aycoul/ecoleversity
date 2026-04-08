"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  GraduationCap,
  Video,
  CheckCircle2,
  XCircle,
  MapPin,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS } from "@/types/domain";
import type { Subject, GradeLevel } from "@/types/domain";

type TeacherVerificationCardProps = {
  teacherId: string;
  userId: string;
  name: string;
  city: string;
  avatarUrl?: string | null;
  subjects: string[];
  gradeLevels: string[];
  cniUrl?: string | null;
  diplomaUrl?: string | null;
  videoUrl?: string | null;
  createdAt: string;
};

export function TeacherVerificationCard({
  teacherId,
  name,
  city,
  avatarUrl,
  subjects,
  gradeLevels,
  cniUrl,
  diplomaUrl,
  videoUrl,
  createdAt,
}: TeacherVerificationCardProps) {
  const t = useTranslations("dashboard.admin");
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  async function handleAction(action: "approve" | "reject", reason?: string) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/verify-teacher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId, action, reason }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Unknown error");
        }

        toast.success(action === "approve" ? t("approved") : t("rejected"));
        setRejectOpen(false);
        setDismissed(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function openDocument(url: string | null | undefined, title: string) {
    if (!url) return;

    // Videos and PDFs open in new tab, images in dialog
    const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
    if (isImage) {
      setPreviewUrl(url);
      setPreviewTitle(title);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  if (dismissed) {
    return null;
  }

  const joinDate = new Date(createdAt).toLocaleDateString("fr-CI", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <Card
        className={cn(
          "transition-all duration-300",
          dismissed && "scale-95 opacity-0"
        )}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <CardTitle>{name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="size-3" />
                {city}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <CalendarDays className="size-3" />
            {t("joinedOn", { date: joinDate })}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Subjects */}
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {subjects.map((s) => (
                <Badge key={s} variant="secondary" className="text-[0.65rem]">
                  {SUBJECT_LABELS[s as Subject] ?? s}
                </Badge>
              ))}
            </div>
          )}

          {/* Grade levels */}
          {gradeLevels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {gradeLevels.map((g) => (
                <Badge key={g} variant="outline" className="text-[0.65rem]">
                  {GRADE_LEVEL_LABELS[g as GradeLevel] ?? g}
                </Badge>
              ))}
            </div>
          )}

          {/* Document links */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => openDocument(cniUrl, t("viewCNI"))}
              disabled={!cniUrl}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileText className="size-3.5" />
              {t("viewCNI")}
            </button>
            <button
              type="button"
              onClick={() => openDocument(diplomaUrl, t("viewDiploma"))}
              disabled={!diplomaUrl}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <GraduationCap className="size-3.5" />
              {t("viewDiploma")}
            </button>
            <button
              type="button"
              onClick={() => openDocument(videoUrl, t("viewVideo"))}
              disabled={!videoUrl}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Video className="size-3.5" />
              {t("viewVideo")}
            </button>
          </div>
        </CardContent>

        <CardFooter className="gap-2">
          <Button
            onClick={() => handleAction("approve")}
            disabled={isPending}
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <CheckCircle2 className="size-4" />
            {t("approveTeacher")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setRejectOpen(true)}
            disabled={isPending}
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <XCircle className="size-4" />
            {t("rejectTeacher")}
          </Button>
        </CardFooter>
      </Card>

      {/* Image preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img
              src={previewUrl}
              alt={previewTitle}
              className="w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rejectTeacher")} — {name}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={t("rejectReason")}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => handleAction("reject", rejectReason || undefined)}
              disabled={isPending}
            >
              {t("rejectConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
