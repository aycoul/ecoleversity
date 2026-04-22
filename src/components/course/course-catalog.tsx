"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { CourseCard, type CourseCardData } from "./course-card";
import {
  SUBJECT_LABELS,
  GRADE_LEVEL_LABELS,
  TARGET_EXAM_LABELS,
  SUBJECTS,
  GRADE_LEVELS,
  TARGET_EXAMS,
} from "@/types/domain";
import type { Subject, GradeLevel, TargetExam } from "@/types/domain";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type SortOption =
  | "popularity"
  | "rating"
  | "price_low"
  | "price_high"
  | "newest";

type CourseCatalogProps = {
  courses: CourseCardData[];
  initialSubject?: string;
  initialGrade?: string;
  initialExam?: string;
  initialSort?: string;
};

export function CourseCatalog({
  courses,
  initialSubject,
  initialGrade,
  initialExam,
  initialSort,
}: CourseCatalogProps) {
  const t = useTranslations("courseCatalog");
  const router = useRouter();
  const pathname = usePathname();

  const [subject, setSubject] = useState(initialSubject ?? "");
  const [grade, setGrade] = useState(initialGrade ?? "");
  const [exam, setExam] = useState(initialExam ?? "");
  const [sort, setSort] = useState<SortOption>(
    (initialSort as SortOption) ?? "popularity"
  );

  const updateQueryParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(window.location.search);
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  useEffect(() => {
    updateQueryParams({
      subject,
      grade,
      exam,
      sort: sort === "popularity" ? "" : sort,
    });
  }, [subject, grade, exam, sort, updateQueryParams]);

  const filtered = useMemo(() => {
    let result = courses.filter((c) => {
      if (subject && c.subject !== subject) return false;
      if (grade && c.grade_level !== grade) return false;
      return true;
    });

    // Sort
    switch (sort) {
      case "popularity":
        result = [...result].sort(
          (a, b) => b.enrollment_count - a.enrollment_count
        );
        break;
      case "rating":
        result = [...result].sort(
          (a, b) => Number(b.rating_avg) - Number(a.rating_avg)
        );
        break;
      case "price_low":
        result = [...result].sort((a, b) => a.price_xof - b.price_xof);
        break;
      case "price_high":
        result = [...result].sort((a, b) => b.price_xof - a.price_xof);
        break;
      case "newest":
        // Already sorted by newest from server if needed; keep original order
        break;
    }

    return result;
  }, [courses, subject, grade, exam, sort]);

  const selectClass =
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  const hasFilters = subject || grade || exam;

  const filterContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          {t("filterSubject")}
        </label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={selectClass}
          name="subject"
        >
          <option value="">{t("allSubjects")}</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {SUBJECT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          {t("filterGrade")}
        </label>
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className={selectClass}
          name="grade"
        >
          <option value="">{t("allGrades")}</option>
          {GRADE_LEVELS.map((g) => (
            <option key={g} value={g}>
              {GRADE_LEVEL_LABELS[g]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          {t("filterExam")}
        </label>
        <select
          value={exam}
          onChange={(e) => setExam(e.target.value)}
          className={selectClass}
          name="exam"
        >
          <option value="">{t("allExams")}</option>
          {TARGET_EXAMS.map((e) => (
            <option key={e} value={e}>
              {TARGET_EXAM_LABELS[e]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          {t("sortBy")}
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className={selectClass}
          name="sort"
        >
          <option value="popularity">{t("sortPopularity")}</option>
          <option value="rating">{t("sortRating")}</option>
          <option value="price_low">{t("sortPriceLow")}</option>
          <option value="price_high">{t("sortPriceHigh")}</option>
          <option value="newest">{t("sortNewest")}</option>
        </select>
      </div>
      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSubject("");
            setGrade("");
            setExam("");
            setSort("popularity");
          }}
        >
          <X className="mr-1 size-3" />
          {t("allSubjects")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Desktop filters */}
      <div className="hidden items-end gap-4 md:flex">{filterContent}</div>

      {/* Mobile filter sheet */}
      <div className="flex items-center justify-between md:hidden">
        <p className="text-sm text-slate-500">
          {t("results", { count: filtered.length })}
        </p>
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" size="sm">
                <Filter className="mr-1 size-4" />
                {t("filters")}
              </Button>
            }
          />
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>{t("filters")}</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">{filterContent}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Results count -- desktop */}
      <p className="hidden text-sm text-slate-500 md:block">
        {t("results", { count: filtered.length })}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">
          {t("noResults")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
