/**
 * Larger SVG bar chart for the finance dashboard. One value per bucket,
 * optional second-series overlay (e.g. previous period). Self-contained,
 * no external chart library.
 */

type Props = {
  labels: string[];
  series: number[];
  /** Optional second series rendered as a faint background bar behind series[]. */
  comparison?: number[];
  height?: number;
  tone?: "blue" | "green" | "violet" | "amber";
  /** Tick formatter for Y axis values. Defaults to integer with thousands separator. */
  formatY?: (v: number) => string;
};

const TONES = {
  blue: { fill: "var(--ev-blue, #2563eb)", soft: "#bfdbfe" },
  green: { fill: "var(--ev-green, #16a34a)", soft: "#bbf7d0" },
  violet: { fill: "#7c3aed", soft: "#ddd6fe" },
  amber: { fill: "#d97706", soft: "#fde68a" },
};

const HORIZONTAL_PADDING = 20;
const TOP_PADDING = 12;
const BOTTOM_AXIS = 28;
const LEFT_AXIS = 56;

export function BarChart({
  labels,
  series,
  comparison,
  height = 220,
  tone = "blue",
  formatY = (v) => v.toLocaleString("fr-FR"),
}: Props) {
  const t = TONES[tone];
  const len = series.length;
  if (len === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
        Aucune donnée sur la période.
      </div>
    );
  }

  const allValues = comparison ? [...series, ...comparison] : series;
  const max = Math.max(...allValues, 1);
  const niceMax = niceCeiling(max);

  // Reserve a width that scales with number of buckets — keeps bars wide
  // enough to read at 90 buckets but not stretched at 7.
  const minBarSlot = 14;
  const computedWidth = Math.max(560, LEFT_AXIS + HORIZONTAL_PADDING * 2 + len * minBarSlot);
  const chartWidth = computedWidth - LEFT_AXIS - HORIZONTAL_PADDING * 2;
  const chartHeight = height - TOP_PADDING - BOTTOM_AXIS;
  const slot = chartWidth / len;
  const barWidth = Math.max(2, slot * 0.7);

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => (niceMax * i) / yTicks);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${computedWidth} ${height}`} width={computedWidth} height={height}>
        {/* gridlines + Y ticks */}
        {tickValues.map((tv, i) => {
          const y = TOP_PADDING + chartHeight - (tv / niceMax) * chartHeight;
          return (
            <g key={i}>
              <line
                x1={LEFT_AXIS}
                x2={LEFT_AXIS + chartWidth}
                y1={y}
                y2={y}
                stroke={i === 0 ? "#cbd5e1" : "#e2e8f0"}
                strokeDasharray={i === 0 ? "" : "2 2"}
              />
              <text
                x={LEFT_AXIS - 6}
                y={y}
                fontSize="10"
                textAnchor="end"
                dominantBaseline="middle"
                fill="#64748b"
              >
                {formatY(tv)}
              </text>
            </g>
          );
        })}

        {/* bars */}
        {series.map((v, i) => {
          const cx = LEFT_AXIS + i * slot + slot / 2;
          const h = (v / niceMax) * chartHeight;
          const y = TOP_PADDING + chartHeight - h;
          const cmp = comparison?.[i] ?? 0;
          const cmpH = (cmp / niceMax) * chartHeight;
          const cmpY = TOP_PADDING + chartHeight - cmpH;
          return (
            <g key={i}>
              {comparison && cmp > 0 && (
                <rect
                  x={cx - barWidth / 2}
                  y={cmpY}
                  width={barWidth}
                  height={cmpH}
                  fill={t.soft}
                  opacity={0.6}
                  rx={2}
                />
              )}
              <rect
                x={cx - barWidth / 2}
                y={y}
                width={barWidth}
                height={h}
                fill={t.fill}
                rx={2}
              />
            </g>
          );
        })}

        {/* X axis labels — show every Nth so they don't collide */}
        {labels.map((lab, i) => {
          const everyN = Math.max(1, Math.ceil(len / 8));
          if (i % everyN !== 0 && i !== len - 1) return null;
          const cx = LEFT_AXIS + i * slot + slot / 2;
          return (
            <text
              key={i}
              x={cx}
              y={height - 8}
              fontSize="10"
              textAnchor="middle"
              fill="#64748b"
            >
              {lab}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/** Round a max value up to a friendly number (1e3, 5e3, 1e4 …) for axis ticks. */
function niceCeiling(n: number): number {
  if (n <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(n)));
  const m = n / exp;
  let nice;
  if (m <= 1) nice = 1;
  else if (m <= 2) nice = 2;
  else if (m <= 5) nice = 5;
  else nice = 10;
  return nice * exp;
}
