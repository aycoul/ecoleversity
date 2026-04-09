"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type FollowButtonProps = {
  teacherId: string;
  currentUserId: string | null;
  initialIsFollowing: boolean;
  followerCount: number;
};

export function FollowButton({
  teacherId,
  currentUserId,
  initialIsFollowing,
  followerCount: initialCount,
}: FollowButtonProps) {
  const t = useTranslations("teacher");
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  async function handleToggle() {
    if (!currentUserId) return;

    startTransition(async () => {
      const supabase = createClient();

      if (isFollowing) {
        const { error } = await supabase
          .from("teacher_followers")
          .delete()
          .eq("parent_id", currentUserId)
          .eq("teacher_id", teacherId);

        if (!error) {
          setIsFollowing(false);
          setCount((c) => Math.max(0, c - 1));

          // Update follower_count on teacher_profiles
          await supabase
            .from("teacher_profiles")
            .update({ follower_count: Math.max(0, count - 1) })
            .eq("id", teacherId);
        }
      } else {
        const { error } = await supabase
          .from("teacher_followers")
          .insert({ parent_id: currentUserId, teacher_id: teacherId });

        if (!error) {
          setIsFollowing(true);
          setCount((c) => c + 1);

          await supabase
            .from("teacher_profiles")
            .update({ follower_count: count + 1 })
            .eq("id", teacherId);
        }
      }
    });
  }

  if (!currentUserId) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isFollowing ? "outline" : "default"}
        size="sm"
        disabled={isPending}
        onClick={handleToggle}
        className={cn(
          isFollowing
            ? "border-[var(--ev-green)]/20 text-[var(--ev-blue)] hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            : "bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)]"
        )}
      >
        <Heart
          className={cn("mr-1.5 size-4", isFollowing && "fill-current")}
        />
        {isFollowing ? t("following") : t("follow")}
      </Button>
      <span className="text-xs text-slate-500">
        {t("followers", { count })}
      </span>
    </div>
  );
}
