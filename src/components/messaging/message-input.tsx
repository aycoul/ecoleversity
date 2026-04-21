"use client";

import { useState, useRef, type KeyboardEvent, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { Send, Paperclip, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const ALLOWED_EXTENSIONS = ".pdf,.doc,.docx,.txt,.xlsx";
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type Attachment = {
  name: string;
  url: string;
  size: number;
};

type MessageInputProps = {
  conversationId: string;
  onMessageSent: () => void;
  /** When the parent is in kid mode, stamp the learner on outbound messages. */
  actingAsLearnerId?: string;
};

export function MessageInput({
  conversationId,
  onMessageSent,
  actingAsLearnerId,
}: MessageInputProps) {
  const t = useTranslations("messaging");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function autoGrow() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Validate type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error(t("fileOnly"));
      return;
    }

    // Check for images explicitly
    if (file.type.startsWith("image/")) {
      toast.error(t("noImages"));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Fichier trop volumineux (max 10 Mo)");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${conversationId}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("message-attachments")
        .upload(path, file);

      if (error) {
        toast.error("Erreur lors du téléchargement");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("message-attachments").getPublicUrl(path);

      setAttachments((prev) => [
        ...prev,
        { name: file.name, url: publicUrl, size: file.size },
      ]);
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: trimmed || "(fichier joint)",
          attachments,
          learnerId: actingAsLearnerId,
        }),
      });

      const data = await res.json();

      if (res.status === 422 && data.error === "pii_blocked") {
        // Moderation blocked — show the server-provided French message
        toast.error(
          data.message ??
            "Votre message contient des informations personnelles interdites."
        );
        return;
      }

      if (!res.ok) {
        toast.error(data.error ?? "Erreur");
        return;
      }

      setContent("");
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      onMessageSent();
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend =
    (content.trim().length > 0 || attachments.length > 0) &&
    !sending &&
    !uploading;

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
            >
              <FileText className="size-3.5" />
              <span className="max-w-[120px] truncate">{att.name}</span>
              <button
                onClick={() => removeAttachment(i)}
                className="ml-1 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File attachment */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS}
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-slate-400 hover:text-slate-600"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title={t("attachFile")}
        >
          <Paperclip className="size-5" />
        </Button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            autoGrow();
          }}
          onKeyDown={handleKeyDown}
          placeholder={t("typeMessage")}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[var(--ev-green)]/30 focus:outline-none focus:ring-1 focus:ring-[var(--ev-green)]/30"
        />

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          className="shrink-0 bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)] disabled:opacity-50"
          onClick={handleSend}
          disabled={!canSend}
          title={t("send")}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
