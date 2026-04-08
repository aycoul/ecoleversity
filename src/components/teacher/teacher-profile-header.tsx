import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Star, MapPin } from "lucide-react";
import { FollowButton } from "./follow-button";

type TeacherProfileHeaderProps = {
  teacher: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    city: string | null;
    created_at: string;
    verification_status: string;
    rating_avg: number;
    rating_count: number;
    follower_count: number;
  };
  currentUserId: string | null;
  isFollowing: boolean;
};

export function TeacherProfileHeader({
  teacher,
  currentUserId,
  isFollowing,
}: TeacherProfileHeaderProps) {
  const t = useTranslations("teacher");

  const isVerified = teacher.verification_status === "fully_verified";

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <Avatar className="size-20 border-2 border-emerald-100 sm:size-24">
        <AvatarImage src={teacher.avatar_url ?? undefined} alt={teacher.display_name} />
        <AvatarFallback className="bg-emerald-100 text-2xl font-bold text-emerald-700">
          {teacher.display_name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 text-center sm:text-left">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <h1 className="text-xl font-bold text-slate-900">
            {teacher.display_name}
          </h1>
          {isVerified && (
            <Badge
              variant="secondary"
              className="gap-1 bg-emerald-100 text-emerald-700"
            >
              <ShieldCheck className="size-3" />
              {t("verified")}
            </Badge>
          )}
        </div>

        {teacher.city && (
          <p className="mt-0.5 flex items-center justify-center gap-1 text-sm text-slate-500 sm:justify-start">
            <MapPin className="size-3.5" />
            {teacher.city}
          </p>
        )}

        {teacher.rating_count > 0 && (
          <div className="mt-1 flex items-center justify-center gap-1 sm:justify-start">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-4 ${
                    i < Math.round(teacher.rating_avg)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500">
              {t("rating", {
                rating: teacher.rating_avg.toFixed(1),
                count: teacher.rating_count,
              })}
            </span>
          </div>
        )}

        <div className="mt-3">
          <FollowButton
            teacherId={teacher.id}
            currentUserId={currentUserId}
            initialIsFollowing={isFollowing}
            followerCount={teacher.follower_count}
          />
        </div>
      </div>
    </div>
  );
}
