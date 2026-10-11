import { C, Frame, type IllustrationProps } from "./frame";

const BARS = [34, 52, 42, 64, 56, 78, 70];
const DOTS: [number, number, number][] = [
  [262, 150, 7],
  [292, 128, 5],
  [310, 170, 9],
  [338, 146, 5],
];

/** An abstract review dashboard (KPIs, bar chart, map with clusters) on a tablet. */
export function ReviewDashboard(props: IllustrationProps) {
  return (
    <Frame viewBox="0 0 400 280" {...props}>
      <ellipse cx="200" cy="262" rx="160" ry="12" fill={C.b100} />
      <rect x="24" y="20" width="352" height="232" rx="22" fill={C.b900} />
      <rect x="36" y="32" width="328" height="208" rx="14" fill={C.canvas} />
      <rect x="36" y="32" width="56" height="208" rx="14" fill={C.b100} />
      <rect x="78" y="32" width="14" height="208" fill={C.b100} />
      {[56, 80, 104, 128].map((y, i) => (
        <rect key={y} x="50" y={y} width="28" height="10" rx="5" fill={i === 0 ? C.b600 : C.b300} opacity={i === 0 ? 1 : 0.7} />
      ))}
      {[104, 186, 268].map((x, i) => (
        <g key={x}>
          <rect x={x} y="46" width="76" height="44" rx="10" fill={C.white} stroke={C.b100} strokeWidth="2" />
          <rect x={x + 10} y="56" width="30" height="6" rx="3" fill={C.muted} opacity="0.4" />
          <rect x={x + 10} y="70" width={i === 1 ? 44 : 34} height="10" rx="4" fill={i === 1 ? C.amber : C.b900} />
        </g>
      ))}
      <rect x="104" y="102" width="138" height="124" rx="12" fill={C.white} stroke={C.b100} strokeWidth="2" />
      {BARS.map((h, i) => (
        <rect key={i} x={116 + i * 17} y={212 - h} width="11" height={h} rx="3" fill={i === 5 ? C.b600 : C.b300} />
      ))}
      <path d="M116 150 L134 140 L150 146 L168 124 L186 130 L204 112 L226 118" stroke={C.b900} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <rect x="250" y="102" width="94" height="124" rx="12" fill={C.b50} stroke={C.b100} strokeWidth="2" />
      <path d="M256 120 C276 112 296 124 318 116 S338 120 340 118 M254 196 C278 186 300 206 340 192" stroke={C.b200} strokeWidth="3" fill="none" strokeLinecap="round" />
      {DOTS.map(([x, y, r], i) => (
        <g key={x}>
          <circle cx={x} cy={y} r={r + 6} fill={i === 2 ? C.amber : C.b400} opacity="0.25" />
          <circle cx={x} cy={y} r={r} fill={i === 2 ? C.amber : C.b500} />
        </g>
      ))}
    </Frame>
  );
}
