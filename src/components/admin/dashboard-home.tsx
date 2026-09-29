"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";

import content from "@/data/content.json";

const copy = content.dashboard;

type MonthPoint = { label: string; year: number; month: number; count: number };
type CategoryPoint = { name: string; total: number; published: number };
type RecentProduct = {
  id: string;
  name: string;
  category: string;
  is_published: boolean;
  is_featured: boolean;
  updated_at: string;
};
type WhatsAppProduct = {
  name: string;
  slug: string;
  card_clicks: number;
  page_clicks: number;
  featured_clicks: number;
};
type InsightDay = {
  label: string;
  visitors: number;
  page_views: number;
  clicks: number;
};
type DashboardPayload = {
  products_total: number;
  products_published: number;
  products_added_this_month: number;
  categories_total: number;
  categories_active: number;
  reviews_published: number;
  rating_average: number | null;
  visitors_30d: number;
  page_views_30d: number;
  whatsapp_card_clicks: number;
  whatsapp_card_clicks_month: number;
  whatsapp_products: WhatsAppProduct[];
  insight_days: InsightDay[];
  months: MonthPoint[];
  categories: CategoryPoint[];
  recent_products: RecentProduct[];
};

type Metric = {
  label: string;
  value: string;
  suffix: string;
  icon: string;
  delta: string;
  hint: string;
};

export function DashboardHome({ greeting, updatedAt }: { greeting: string; updatedAt: string }) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/dashboard", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as DashboardPayload & { error?: string };
        if (!response.ok || !body || typeof body.products_total !== "number") {
          throw new Error(body?.error || copy.unavailable);
        }
        setData(body);
        setError("");
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(copy.unavailable);
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") setReloadKey((value) => value + 1);
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  const metrics = data ? metricsFrom(data) : [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-8">
      <header className="rise-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-green-deep uppercase">{greeting}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{copy.title}</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">{copy.subtitle}</p>
        </div>
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
          {copy.updatedPrefix} <span className="font-semibold text-slate-700">{updatedAt}</span>
        </p>
      </header>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p>{error}</p>
          <button className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-700" onClick={() => setReloadKey((value) => value + 1)} type="button">
            {copy.retry}
          </button>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data
          ? metrics.map((metric, index) => <MetricCard index={index} key={metric.label} metric={metric} />)
          : [0, 1, 2, 3].map((index) => <div className="h-32 animate-pulse rounded-2xl bg-white" key={index} />)}
      </section>

      {data ? <SiteInsight data={data} /> : (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="h-80 animate-pulse rounded-2xl bg-white lg:col-span-7" />
          <div className="h-80 animate-pulse rounded-2xl bg-white lg:col-span-5" />
        </section>
      )}

      {data ? <RecentProducts products={data.recent_products} /> : <div className="h-64 animate-pulse rounded-2xl bg-white" />}
      <span className="sr-only">{data ? "" : copy.loading}</span>
    </div>
  );
}

function SiteInsight({ data }: { data: DashboardPayload }) {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <InsightLine days={data.insight_days ?? []} />
      <InsightBars products={data.whatsapp_products ?? []} />
    </section>
  );
}

function InsightLine({ days }: { days: InsightDay[] }) {
  const insight = copy.insight;
  const ranges = [
    { id: "visitors", label: insight.visitors, values: days.map((day) => day.visitors) },
    { id: "views", label: insight.views, values: days.map((day) => day.page_views) },
    { id: "clicks", label: insight.clicks, values: days.map((day) => day.clicks) },
  ];
  const [rangeId, setRangeId] = useState(ranges[0].id);
  const range = ranges.find((item) => item.id === rangeId) ?? ranges[0];
  const labels = days.map((day) => day.label);
  const values = range.values.length > 0 ? range.values : [0];
  const yMax = axisMax(values);
  const seriesKey = values.join(",");
  const geometry = useMemo(() => chartPoints(seriesKey ? seriesKey.split(",").map(Number) : [], yMax), [seriesKey, yMax]);
  const [active, setActive] = useState(() => peakIndex(values));

  useEffect(() => {
    setActive(peakIndex(seriesKey ? seriesKey.split(",").map(Number) : []));
  }, [range.id, seriesKey]);

  const point = geometry.points[active] ?? geometry.points[0];

  return (
    <div className="dashboard-card flex flex-col rounded-2xl border border-slate-100 bg-white p-6 lg:col-span-7">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">{insight.lineTitle}</h2>
          <p className="text-xs text-slate-400">{insight.lineSubtitle}</p>
        </div>
        <RangeSwitch onChange={setRangeId} ranges={ranges} value={rangeId} />
      </div>
      <div className="relative h-64 w-full">
        <div className="pointer-events-none absolute top-2 bottom-6 left-0 flex flex-col justify-between text-[11px] font-medium text-slate-400">
          {axisLabels(yMax).map((value, index) => (
            <span key={`${value}-${index}`}>{value}</span>
          ))}
        </div>
        <div className="ml-10 h-full">
          <div className="relative h-52" onMouseLeave={() => setActive(peakIndex(values))}>
            <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${geometry.width} ${geometry.height}`}>
              <defs>
                <linearGradient id="insightFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#85c121" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#85c121" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3, 4, 5].map((line) => (
                <line key={line} stroke="#e2e8f0" strokeWidth="1" x1="0" x2={geometry.width} y1={(line / 5) * geometry.height} y2={(line / 5) * geometry.height} />
              ))}
              <path d={geometry.area} fill="url(#insightFill)" />
              <path className="chart-line" d={geometry.line} fill="none" key={range.id} pathLength={1} stroke="#85c121" strokeLinecap="round" strokeWidth="3" />
            </svg>
            {point ? (
              <div className="pointer-events-none absolute z-10" style={{ left: `${(point.x / geometry.width) * 100}%`, top: `${(point.y / geometry.height) * 100}%` }}>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-white shadow-lg">
                  {labels[active] ?? ""} Â· {point.value}
                </div>
                <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-brand-green-deep bg-white" />
              </div>
            ) : null}
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${Math.max(labels.length, 1)}, minmax(0, 1fr))` }}>
              {labels.map((label, index) => (
                <button
                  aria-label={`${label}: ${values[index]}`}
                  className="h-full cursor-crosshair"
                  key={`${range.id}-${label}-${index}`}
                  onFocus={() => setActive(index)}
                  onMouseEnter={() => setActive(index)}
                  type="button"
                />
              ))}
            </div>
          </div>
          <div className="grid pt-2 text-center text-[10px] font-medium text-slate-400" style={{ gridTemplateColumns: `repeat(${Math.max(labels.length, 1)}, minmax(0, 1fr))` }}>
            {labels.map((label, index) => (
              <span className={index === active ? "font-semibold text-brand-green-deep" : ""} key={`${label}-${index}`}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightBars({ products }: { products: WhatsAppProduct[] }) {
  const insight = copy.insight;
  const ranges = [
    { id: "card", label: insight.card, values: products.map((item) => item.card_clicks) },
    { id: "page", label: insight.page, values: products.map((item) => item.page_clicks) },
    { id: "featured", label: insight.featured, values: products.map((item) => item.featured_clicks) },
  ];
  const [rangeId, setRangeId] = useState(ranges[0].id);
  const range = ranges.find((item) => item.id === rangeId) ?? ranges[0];
  const [active, setActive] = useState(() => peakIndex(ranges[0].values));
  const [pinned, setPinned] = useState<number | null>(null);
  const yMax = axisMax(range.values);
  const seriesKey = range.values.join(",");
  const shown = pinned ?? active;

  useEffect(() => {
    setActive(peakIndex(seriesKey ? seriesKey.split(",").map(Number) : []));
    setPinned(null);
  }, [range.id, seriesKey]);

  return (
    <div className="dashboard-card flex flex-col rounded-2xl border border-slate-100 bg-white p-6 lg:col-span-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">{insight.barTitle}</h2>
          <p className="text-xs text-slate-400">{insight.barSubtitle}</p>
        </div>
        <RangeSwitch onChange={setRangeId} ranges={ranges} value={rangeId} />
      </div>
      {products.length === 0 ? (
        <p className="flex h-52 items-center justify-center text-sm text-slate-500">{insight.empty}</p>
      ) : (
        <div className="relative h-64 w-full">
          <div className="pointer-events-none absolute top-2 bottom-6 left-0 flex flex-col justify-between text-[11px] font-medium text-slate-400">
            {axisLabels(yMax).map((value, index) => (
              <span key={`${value}-${index}`}>{value}</span>
            ))}
          </div>
          <div className="ml-10 flex h-full flex-col">
            <div className="flex h-52 items-end gap-2 overflow-x-auto px-1">
              {range.values.map((value, index) => {
                const selected = index === shown;
                const name = products[index]?.name ?? "";
                return (
                  <button
                    aria-label={`${name}: ${value}`}
                    aria-pressed={pinned === index}
                    className="group flex h-full min-w-8 flex-1 flex-col items-center justify-end"
                    key={`${range.id}-${name}`}
                    onClick={() => setPinned((current) => (current === index ? null : index))}
                    onFocus={() => setActive(index)}
                    onMouseEnter={() => setActive(index)}
                    type="button"
                  >
                    <span className={`mb-1 text-[10px] font-bold text-brand-green-deep ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>{value}</span>
                    <span
                      className={`w-3 max-w-full rounded-full transition-all duration-300 ${selected ? "bg-brand-green-deep" : "bg-brand-green/80 group-hover:bg-brand-green"}`}
                      style={{ height: `${value === 0 ? 0 : Math.max(8, (value / yMax) * 100)}%` }}
                    />
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2 px-1 text-center text-[10px] font-medium text-slate-400">
              {products.map((item, index) => (
                <span className={`min-w-0 flex-1 truncate ${index === shown ? "font-semibold text-brand-green-deep" : ""}`} key={item.slug} title={item.name}>
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function metricsFrom(data: DashboardPayload): Metric[] {
  const drafts = Math.max(0, data.products_total - data.products_published);
  const rating = data.rating_average;
  const labels = copy.metrics;
  return [
    {
      label: labels[0].label,
      value: String(data.products_total),
      suffix: "",
      icon: labels[0].icon,
      delta: data.products_added_this_month > 0 ? `+${data.products_added_this_month}` : "0",
      hint: labels[0].hint,
    },
    {
      label: labels[1].label,
      value: String(data.products_published),
      suffix: "",
      icon: labels[1].icon,
      delta: String(drafts),
      hint: labels[1].hint,
    },
    {
      label: labels[2].label,
      value: String(data.categories_total),
      suffix: "",
      icon: labels[2].icon,
      delta: String(data.categories_active),
      hint: labels[2].hint,
    },
    {
      label: labels[3].label,
      value: rating === null ? (labels[3].empty ?? "—") : rating.toFixed(1),
      suffix: rating === null ? "" : (labels[3].suffix ?? ""),
      icon: labels[3].icon,
      delta: String(data.reviews_published),
      hint: rating === null ? (labels[3].emptyHint ?? labels[3].hint) : labels[3].hint,
    },
  ];
}

function MetricCard({ metric, index }: { metric: Metric; index: number }) {
  const value = useCountUp(metric.value);

  return (
    <article
      className="rise-in dashboard-card group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-md"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-brand-green-deep" />
      <div className="flex items-center gap-4">
        <MetricIcon name={metric.icon} />
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-400">{metric.label}</div>
          <div className="mt-0.5 text-2xl font-bold tracking-tight text-slate-800">
            {value}
            {metric.suffix ? <span className="ml-1 text-xs font-normal text-slate-400">{metric.suffix}</span> : null}
          </div>
        </div>
      </div>
      <p className="mt-4 text-[11px] font-medium text-slate-500">
        <span className="font-semibold text-brand-green-deep">{metric.delta}</span> {metric.hint}
      </p>
    </article>
  );
}

function useCountUp(value: string) {
  const [text, setText] = useState(value);

  useEffect(() => {
    const target = Number(value);
    const decimals = value.includes(".") ? (value.split(".")[1]?.length ?? 0) : 0;
    if (!Number.isFinite(target)) {
      setText(value);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(target.toFixed(decimals));
      return;
    }

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / 700);
      const eased = 1 - (1 - progress) ** 3;
      setText((target * eased).toFixed(decimals));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return text;
}

function MetricIcon({ name }: { name: string }) {
  const shell = "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl";
  if (name === "published") {
    return (
      <div className={`${shell} bg-brand-green-deep/10 text-brand-green-deep`}>
        <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </div>
    );
  }
  if (name === "categories") {
    return (
      <div className={`${shell} bg-brand-green/15 text-brand-green-deep`}>
        <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </div>
    );
  }
  if (name === "rating") {
    return (
      <div className={`${shell} bg-amber-50 text-amber-500`}>
        <svg aria-hidden="true" className="h-6 w-6 fill-amber-400 text-amber-500" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`${shell} bg-brand-green/15 text-brand-green-deep`}>
      <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </div>
  );
}

function RangeSwitch({
  ranges,
  value,
  onChange,
}: {
  ranges: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1">
      {ranges.map((range) => {
        const selected = range.id === value;
        return (
          <button
            aria-pressed={selected}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${selected ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            key={range.id}
            onClick={() => onChange(range.id)}
            type="button"
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}

function chartPoints(values: number[], max: number) {
  const width = 500;
  const height = 180;
  const safe = values.length > 0 ? values : [0];
  const points = safe.map((value, index) => {
    const x = safe.length === 1 ? width / 2 : (index / (safe.length - 1)) * width;
    const y = height - 10 - (value / max) * (height - 20);
    return { x, y, value };
  });

  let line = `M ${points[0].x},${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const control = (current.x + next.x) / 2;
    line += ` C ${control},${current.y} ${control},${next.y} ${next.x},${next.y}`;
  }

  const last = points[points.length - 1];
  const area = `${line} L ${last.x},${height} L ${points[0].x},${height} Z`;
  return { line, area, points, width, height };
}

function peakIndex(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((best, value, index) => (value > values[best] ? index : best), 0);
}

function axisMax(values: number[]) {
  const peak = Math.max(0, ...values);
  const padded = Math.max(5, Math.ceil(peak * 1.2));
  return Math.ceil(padded / 5) * 5;
}

function axisLabels(max: number) {
  return [5, 4, 3, 2, 1, 0].map((step) => String((max * step) / 5));
}

function RecentProducts({ products }: { products: RecentProduct[] }) {
  const table = copy.recent;
  const categories = useMemo(() => [...new Set(products.map((row) => row.category))], [products]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const titleId = useId();

  const rows = products.filter((row) => {
    const haystack = `${row.name} ${row.category}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesCategory = category === "all" || row.category === category;
    return matchesQuery && matchesCategory;
  });
  const openRow = products.find((row) => row.id === openId) ?? null;

  useEffect(() => {
    if (!openId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  return (
    <section className="dashboard-card rounded-2xl border border-slate-100 bg-white p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">{table.title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{table.subtitle}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-xs font-medium text-slate-400">
            {rows.length} {table.shown}
          </p>
          <label className="relative block">
            <span className="sr-only">{table.searchPlaceholder}</span>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-brand-green-deep focus:ring-2 focus:ring-brand-green/30 focus:outline-none sm:w-64"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={table.searchPlaceholder}
              value={query}
            />
          </label>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterChip active={category === "all"} label={table.allCategories} onClick={() => setCategory("all")} />
          {categories.map((item) => (
            <FilterChip active={category === item} key={item} label={item} onClick={() => setCategory(item)} />
          ))}
        </div>
      ) : null}

      {products.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">{table.emptyCatalog}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] tracking-wider text-slate-400 uppercase">
                {table.columns.map((column, index) => (
                  <th className={`px-3 py-3 font-semibold ${index === table.columns.length - 1 ? "text-right" : ""}`} key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rows.map((row) => (
                <tr className={`transition-colors ${openId === row.id ? "bg-brand-green/10" : "hover:bg-slate-50"}`} key={row.id}>
                  <td className="px-3 py-4 font-semibold text-slate-900">{row.name}</td>
                  <td className="px-3 py-4 text-slate-500">{row.category}</td>
                  <td className="px-3 py-4 text-slate-500">{formatUpdated(row.updated_at)}</td>
                  <td className="px-3 py-4">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold ${row.is_published ? "bg-brand-green/15 text-brand-green-deep" : "bg-slate-100 text-slate-600"}`}>
                      {row.is_published ? table.published : table.draft}
                    </span>
                    {row.is_featured ? <span className="ml-1.5 inline-block rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">{table.featured}</span> : null}
                  </td>
                  <td className="px-3 py-4 text-right">
                    <button
                      aria-expanded={openId === row.id}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-green-deep"
                      onClick={() => setOpenId(row.id)}
                      title={table.view}
                      type="button"
                    >
                      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {products.length > 0 && rows.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">{table.empty}</p> : null}

      <div className="mt-6 border-t border-slate-100 pt-4 text-center">
        <Link className="inline-flex items-center gap-1 text-xs font-semibold text-brand-green-deep transition-colors hover:text-slate-900" href="/produk">
          <span>{table.viewAll}</span>
          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </Link>
      </div>

      {openRow ? (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button aria-label={table.close} className="absolute inset-0 bg-slate-900/30" onClick={() => setOpenId(null)} type="button" />
          <aside aria-labelledby={titleId} className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl" role="dialog">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{openRow.category}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900" id={titleId}>
                  {table.detailTitle}
                </h3>
              </div>
              <button className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100" onClick={() => setOpenId(null)} type="button">
                {table.close}
              </button>
            </div>
            <dl className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 text-sm">
              <Detail label={table.columns[0]} value={openRow.name} />
              <Detail label={table.columns[1]} value={openRow.category} />
              <Detail label={table.updatedLabel} value={formatUpdated(openRow.updated_at)} />
              <Detail label={table.columns[3]} value={openRow.is_published ? table.published : table.draft} />
              {openRow.is_featured ? <Detail label={table.featured} value={table.featured} /> : null}
            </dl>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function formatUpdated(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(".", ":");
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${active ? "bg-brand-green-deep text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
