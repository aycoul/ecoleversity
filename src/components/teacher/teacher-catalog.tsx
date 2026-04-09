"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TeacherCard } from "./teacher-card";
import { SUBJECTS, SUBJECT_LABELS, GRADE_LEVELS, GRADE_LEVEL_LABELS, IVORIAN_CITIES } from "@/types/domain";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { Subject, GradeLevel } from "@/types/domain";

type Teacher = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  subjects: string[];
  grade_levels: string[];
  rating_avg: number;
  rating_count: number;
  verification_status: string;
  min_price?: number | null;
};

type TeacherCatalogProps = {
  teachers: Teacher[];
  initialFilters: {
    q?: string;
    subject?: string;
    grade?: string;
    city?: string;
  };
};

export function TeacherCatalog({ teachers, initialFilters }: TeacherCatalogProps) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const hasActiveFilters = useMemo(
    () =>
      !!(
        initialFilters.q ||
        initialFilters.subject ||
        initialFilters.grade ||
        initialFilters.city
      ),
    [initialFilters]
  );

  const filterPanel = (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder={t("searchPlaceholder")}
          defaultValue={initialFilters.q ?? ""}
          className="pl-9"
          onChange={(e) => {
            const value = e.target.value.trim();
            // Debounce: update on blur or enter
          }}
          onBlur={(e) => updateFilter("q", e.target.value.trim() || null)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateFilter("q", (e.target as HTMLInputElement).value.trim() || null);
            }
          }}
        />
      </div>

      {/* Subject filter */}
      <Select
        value={initialFilters.subject ?? ""}
        onValueChange={(v) =>
          updateFilter("subject", v === "__all__" ? null : v)
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("allSubjects")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t("allSubjects")}</SelectItem>
          {SUBJECTS.map((s) => (
            <SelectItem key={s} value={s}>
              {SUBJECT_LABELS[s as Subject]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Grade filter */}
      <Select
        value={initialFilters.grade ?? ""}
        onValueChange={(v) =>
          updateFilter("grade", v === "__all__" ? null : v)
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("allGrades")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t("allGrades")}</SelectItem>
          {GRADE_LEVELS.map((g) => (
            <SelectItem key={g} value={g}>
              {GRADE_LEVEL_LABELS[g as GradeLevel]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* City filter */}
      <Select
        value={initialFilters.city ?? ""}
        onValueChange={(v) =>
          updateFilter("city", v === "__all__" ? null : v)
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("allCities")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t("allCities")}</SelectItem>
          {IVORIAN_CITIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1.5 text-slate-500"
        >
          <X className="size-3.5" />
          {t("reset")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar filters */}
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              {t("filters")}
            </h2>
            {filterPanel}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          {/* Mobile filter trigger */}
          <div className="mb-4 flex items-center justify-between md:hidden">
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="outline" size="sm" className="gap-1.5" />
                }
              >
                <SlidersHorizontal className="size-4" />
                {t("filters")}
                {hasActiveFilters && (
                  <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-[var(--ev-green)]/10 text-xs font-medium text-[var(--ev-blue)]">
                    !
                  </span>
                )}
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>{t("filters")}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 px-4">{filterPanel}</div>
              </SheetContent>
            </Sheet>

            <span className="text-xs text-slate-500">
              {t("results", { count: teachers.length })}
            </span>
          </div>

          {/* Results count (desktop) */}
          <div className="mb-4 hidden md:block">
            <span className="text-sm text-slate-500">
              {t("results", { count: teachers.length })}
            </span>
          </div>

          {/* Results grid */}
          {teachers.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teachers.map((teacher) => (
                <TeacherCard key={teacher.id} teacher={teacher} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
              <Search className="mb-3 size-10 text-slate-300" />
              <p className="text-lg font-medium text-slate-700">
                {t("noResults")}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {t("noResultsHint")}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  {t("reset")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
