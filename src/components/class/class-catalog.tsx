"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ClassCard, type ClassCardData } from "./class-card";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS, SUBJECTS, GRADE_LEVELS } from "@/types/domain";
import type { Subject, GradeLevel } from "@/types/domain";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ClassCatalogProps = {
  classes: ClassCardData[];
  initialSubject?: string;
  initialGrade?: string;
};

export function ClassCatalog({
  classes,
  initialSubject,
  initialGrade,
}: ClassCatalogProps) {
  const t = useTranslations("groupClass");
  const [subject, setSubject] = useState(initialSubject ?? "");
  const [grade, setGrade] = useState(initialGrade ?? "");

  const filtered = classes.filter((c) => {
    if (subject && c.subject !== subject) return false;
    if (grade && c.grade_level !== grade) return false;
    return true;
  });

  const selectClass =
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  const hasFilters = subject || grade;

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
        >
          <option value="">{t("allGrades")}</option>
          {GRADE_LEVELS.map((g) => (
            <option key={g} value={g}>
              {GRADE_LEVEL_LABELS[g]}
            </option>
          ))}
        </select>
      </div>
      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSubject("");
            setGrade("");
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

      {/* Results count — desktop */}
      <p className="hidden text-sm text-slate-500 md:block">
        {t("results", { count: filtered.length })}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">
          {t("noClasses")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cls) => (
            <ClassCard key={cls.id} cls={cls} />
          ))}
        </div>
      )}
    </div>
  );
}
