"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type SendMessageButtonProps = {
  teacherId: string;
};

export function SendMessageButton({ teacherId }: SendMessageButtonProps) {
  const t = useTranslations("messaging");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: teacherId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Erreur");
        return;
      }

      router.push(
        `/dashboard/parent/messages?conversationId=${data.id}`
      );
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant="outline"
      className="gap-2 border-[var(--ev-green)]/20 text-[var(--ev-blue)] hover:bg-[var(--ev-green-50)]"
    >
      <MessageSquare className="size-4" />
      {t("startConversation")}
    </Button>
  );
}
