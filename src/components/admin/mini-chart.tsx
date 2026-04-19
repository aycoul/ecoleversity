/**
 * Lightweight inline SVG sparkline. No external chart library — one
 * polyline + optional area fill. Handles all-zero series without
 * throwing. Keeps analytics bundle size under control.
 */

type Props = {
  data: number[];
  tone?: "blue" | "green" | "violet" | "amber";
  /** px — the chart draws to this explicit size (no flex). */
  width?: number;
  height?: number;
  /** Render a filled area under the line. Default true. */
  area?: boolean;
};

const TONES = {
  blue: { stroke: "var(--ev-blue, #2563eb)", fill: "rgba(37, 99, 235, 0.15)" },
  green: { stroke: "var(--ev-green, #16a34a)", fill: "rgba(22, 163, 74, 0.15)" },
  violet: { stroke: "#7c3aed", fill: "rgba(124, 58, 237, 0.15)" },
  amber: { stroke: "#d97706", fill: "rgba(217, 119, 6, 0.15)" },
};

export function MiniChart({
  data,
  tone = "blue",
  width = 240,
  height = 56,
  area = true,
}: Props) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const t = TONES[tone];

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const line = points.join(" ");
  const areaPath = `M${points[0]} L${points.slice(1).join(" L")} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {area && <path d={areaPath} fill={t.fill} />}
      <polyline
        points={line}
        fill="none"
        stroke={t.stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
