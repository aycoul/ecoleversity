"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Search, BookOpen, Loader2 } from "lucide-react";

type HelpArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
};

const CATEGORIES = ["all", "parent", "teacher", "payment", "technical"] as const;

export function HelpArticleList() {
  const t = useTranslations("help");
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category !== "all") params.set("category", category);

      const res = await fetch(`/api/help?${params}`);
      const json = await res.json();
      setArticles(json.data ?? []);
      setLoading(false);
    }

    const debounce = setTimeout(load, 300);
    return () => clearTimeout(debounce);
  }, [query, category]);

  const CATEGORY_LABELS: Record<string, string> = {
    all: t("categoryAll"),
    parent: t("categoryParent"),
    teacher: t("categoryTeacher"),
    payment: t("categoryPayment"),
    technical: t("categoryTechnical"),
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-[var(--ev-blue)] focus:outline-none"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              category === cat
                ? "bg-[var(--ev-blue)] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Articles */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-[var(--ev-blue)]" />
        </div>
      ) : articles.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t("noArticles")}</p>
      ) : (
        <div className="space-y-2">
          {articles.map((article) => (
            <button
              key={article.id}
              onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
              className="w-full rounded-xl border border-slate-100 bg-white p-4 text-left transition-all hover:border-[var(--ev-blue)]/10 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 size-5 shrink-0 text-[var(--ev-green)]" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-900">{article.title}</h3>
                  {expandedId === article.id && (
                    <p className="mt-2 text-sm leading-6 text-slate-600">{article.excerpt}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
