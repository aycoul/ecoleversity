"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Star, MapPin } from "lucide-react";
import { Link } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";
import { SUBJECT_LABELS } from "@/types/domain";
import type { Subject } from "@/types/domain";

type TeacherCardProps = {
  teacher: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    city: string | null;
    subjects: string[];
    rating_avg: number;
    rating_count: number;
    verification_status: string;
    min_price?: number | null;
  };
};

export function TeacherCard({ teacher }: TeacherCardProps) {
  const t = useTranslations("catalog");

  const isVerified = teacher.verification_status === "fully_verified";
  const subjects = teacher.subjects as Subject[];
  const displaySubjects = subjects.slice(0, 3);
  const extraCount = subjects.length - 3;

  const initials = teacher.display_name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col items-center gap-3 pt-2 text-center">
        <Link
          href={`/teachers/${teacher.id}`}
          className="flex flex-col items-center gap-3"
        >
          <Avatar className="size-16 border-2 border-[var(--ev-green)]/10">
            <AvatarImage
              src={teacher.avatar_url ?? undefined}
              alt={teacher.display_name}
            />
            <AvatarFallback className="bg-[var(--ev-green)]/10 text-lg font-bold text-[var(--ev-blue)]">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h3 className="font-semibold text-slate-900">
                {teacher.display_name}
              </h3>
              {isVerified && (
                <ShieldCheck className="size-4 text-[var(--ev-blue)]" />
              )}
            </div>

            {teacher.city && (
              <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-slate-500">
                <MapPin className="size-3" />
                {teacher.city}
              </p>
            )}
          </div>
        </Link>

        {/* Rating */}
        {teacher.rating_count > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-3.5 ${
                    i < Math.round(teacher.rating_avg)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500">
              {teacher.rating_avg.toFixed(1)}
            </span>
          </div>
        )}

        {/* Subjects */}
        {displaySubjects.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {displaySubjects.map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="bg-[var(--ev-green-50)] text-[var(--ev-blue)] text-xs"
              >
                {SUBJECT_LABELS[s] ?? s}
              </Badge>
            ))}
            {extraCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{extraCount}
              </Badge>
            )}
          </div>
        )}

        {/* Price */}
        {teacher.min_price != null && teacher.min_price > 0 && (
          <p className="text-xs font-medium text-slate-600">
            {t("startingFrom", { price: teacher.min_price.toLocaleString("fr-CI") })}
          </p>
        )}

        {/* CTA */}
        <Link
          href={`/teachers/${teacher.id}`}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className:
              "mt-1 w-full border-[var(--ev-green)]/20 text-[var(--ev-blue)] hover:bg-[var(--ev-green-50)]",
          })}
        >
          {t("viewProfile")}
        </Link>
      </CardContent>
    </Card>
  );
}
