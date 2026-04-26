/**
 * Self-contained SVG donut chart for category breakdowns.
 * Renders up to 6 slices with auto-color, plus a legend below.
 */

type Slice = {
  label: string;
  value: number;
};

const COLORS = [
  "var(--ev-blue, #2563eb)",
  "var(--ev-green, #16a34a)",
  "#7c3aed",
  "#d97706",
  "#ec4899",
  "#0891b2",
];

export function DonutChart({
  slices,
  size = 160,
  thickness = 28,
  formatValue = (v) => v.toLocaleString("fr-FR"),
}: {
  slices: Slice[];
  size?: number;
  thickness?: number;
  formatValue?: (v: number) => string;
}) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
        Aucune donnée
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - thickness / 2;

  let cursor = -Math.PI / 2;
  const arcs = slices.slice(0, COLORS.length).map((s, i) => {
    const angle = (s.value / total) * 2 * Math.PI;
    const start = cursor;
    const end = cursor + angle;
    cursor = end;
    return { slice: s, color: COLORS[i], start, end, angle };
  });

  function polar(angle: number): [number, number] {
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        {arcs.map((a, i) => {
          const [x1, y1] = polar(a.start);
          const [x2, y2] = polar(a.end);
          const large = a.angle > Math.PI ? 1 : 0;
          const d =
            arcs.length === 1
              ? `M ${cx},${cy - r} A ${r},${r} 0 1 1 ${cx - 0.001},${cy - r} Z`
              : `M ${x1},${y1} A ${r},${r} 0 ${large} 1 ${x2},${y2}`;
          return (
            <path
              key={i}
              d={d}
              stroke={a.color}
              strokeWidth={thickness}
              fill="none"
              strokeLinecap="butt"
            />
          );
        })}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="14"
          fontWeight="600"
          fill="#0f172a"
        >
          {arcs.length}
        </text>
      </svg>
      <ul className="space-y-1.5 text-xs">
        {arcs.map((a, i) => {
          const pct = total > 0 ? (a.slice.value / total) * 100 : 0;
          return (
            <li key={i} className="flex items-center gap-2">
              <span
                className="inline-block size-3 shrink-0 rounded-sm"
                style={{ background: a.color }}
              />
              <span className="font-medium text-slate-700">{a.slice.label}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">{formatValue(a.slice.value)} ({pct.toFixed(1)}%)</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
