"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, type DataPublishOptions, type RemoteParticipant } from "livekit-client";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileText, Upload, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

// State carried across the room: the current slide deck URL + page.
// Using native browser PDF viewer via <iframe src={url}#page=N> — no
// extra dependency, works in all evergreen browsers, jumps pages via
// the URL fragment. The teacher's UI also tracks the total page count
// locally (iframes don't expose it cross-origin), so navigation is
// "page ±1 with a lower bound of 1"; the browser viewer shows its own
// page indicator alongside our teacher controls.

type SlidesStartMsg = { type: "slides_start"; url: string; page: number };
type SlidesPageMsg = { type: "slides_page"; page: number };
type SlidesEndMsg = { type: "slides_end" };

const encode = (m: unknown) => new TextEncoder().encode(JSON.stringify(m));

export function SessionSlides({
  liveClassId,
  userRole,
}: {
  liveClassId: string;
  userRole: "parent" | "teacher";
}) {
  const t = useTranslations("session");
  const room = useRoomContext();

  const [url, setUrl] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [composerOpen, setComposerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for peer updates.
  useEffect(() => {
    const handler = (payload: Uint8Array, _p?: RemoteParticipant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as
          | SlidesStartMsg
          | SlidesPageMsg
          | SlidesEndMsg;
        if (msg.type === "slides_start") {
          setUrl(msg.url);
          setPage(msg.page);
        } else if (msg.type === "slides_page") {
          setPage(msg.page);
        } else if (msg.type === "slides_end") {
          setUrl(null);
          setPage(1);
        }
      } catch {
        // ignore
      }
    };
    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  const broadcast = useCallback(
    (msg: SlidesStartMsg | SlidesPageMsg | SlidesEndMsg) => {
      room.localParticipant.publishData(encode(msg), {
        reliable: true,
      } as DataPublishOptions);
    },
    [room]
  );

  // ── Teacher: upload + start ────────────────────────────────────────
  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error(t("slidesPdfOnly"));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("liveClassId", liveClassId);
      const res = await fetch("/api/slides/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "upload failed");
      setUrl(data.url);
      setPage(1);
      broadcast({ type: "slides_start", url: data.url, page: 1 });
      setComposerOpen(false);
      toast.success(t("slidesUploaded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("slidesUploadError"));
    } finally {
      setUploading(false);
    }
  };

  const stepPage = (dir: 1 | -1) => {
    if (!url) return;
    const next = Math.max(1, page + dir);
    setPage(next);
    broadcast({ type: "slides_page", page: next });
  };

  const end = () => {
    broadcast({ type: "slides_end" });
    setUrl(null);
    setPage(1);
  };

  // Teacher keyboard nav for slides (← / →)
  useEffect(() => {
    if (userRole !== "teacher" || !url) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") stepPage(1);
      if (e.key === "ArrowLeft") stepPage(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, page, userRole]);

  return (
    <>
      {/* Trigger button — teacher only */}
      {userRole === "teacher" && (
        <button
          type="button"
          onClick={() => (url ? setComposerOpen((v) => !v) : setComposerOpen(true))}
          className={`lk-button flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            url
              ? "bg-[var(--ev-blue)] text-white"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title={t("slidesTooltip")}
        >
          <FileText className="size-4" />
          {t("slides")}
        </button>
      )}

      {/* Full-room viewer overlay when a deck is active */}
      {url && (
        <SlidesViewer
          url={url}
          page={page}
          isTeacher={userRole === "teacher"}
          onPrev={() => stepPage(-1)}
          onNext={() => stepPage(1)}
          onEnd={end}
        />
      )}

      {/* Upload composer — teacher only */}
      {composerOpen && userRole === "teacher" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {url ? t("slidesReplace") : t("slidesStart")}
              </h3>
              <button
                onClick={() => setComposerOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">{t("slidesHint")}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={onFilePicked}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm font-medium text-slate-600 transition-colors hover:border-[var(--ev-blue)] hover:text-[var(--ev-blue)] disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("slidesUploading")}
                </>
              ) : (
                <>
                  <Upload className="size-5" />
                  {t("slidesChooseFile")}
                </>
              )}
            </button>
            {url && (
              <button
                type="button"
                onClick={() => {
                  end();
                  setComposerOpen(false);
                }}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                <X className="size-4" />
                {t("slidesEnd")}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SlidesViewer({
  url,
  page,
  isTeacher,
  onPrev,
  onNext,
  onEnd,
}: {
  url: string;
  page: number;
  isTeacher: boolean;
  onPrev: () => void;
  onNext: () => void;
  onEnd: () => void;
}) {
  const t = useTranslations("session");
  // #page= is honored by Chrome/Edge/Firefox's built-in PDF viewer.
  const src = `${url}#page=${page}&toolbar=0&navpanes=0`;
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-slate-900">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-slate-950 px-3 py-2 text-white">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--ev-amber)]">
          <FileText className="size-4" />
          {t("slidesLive")}
          <span className="text-slate-400">· {t("slidesPage", { n: page })}</span>
        </div>
        {isTeacher && (
          <div className="flex items-center gap-1">
            <button
              onClick={onPrev}
              disabled={page <= 1}
              className="rounded px-2 py-1 text-xs text-white hover:bg-white/10 disabled:opacity-40"
              title={t("slidesPrev")}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={onNext}
              className="rounded px-2 py-1 text-xs text-white hover:bg-white/10"
              title={t("slidesNext")}
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              onClick={onEnd}
              className="ml-1 rounded bg-red-500 px-2 py-1 text-xs font-medium hover:bg-red-600"
            >
              {t("slidesEnd")}
            </button>
          </div>
        )}
      </div>
      <iframe
        key={src}
        src={src}
        className="flex-1 bg-white"
        title={t("slidesIframeTitle")}
      />
    </div>
  );
}
