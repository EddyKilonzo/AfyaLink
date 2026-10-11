import { C, Frame, Hut, type IllustrationProps } from "./frame";

const VILLAGES = [
  { x: 84, y: 70, link: "M112 96 C150 104 178 120 202 134" },
  { x: 396, y: 66, link: "M370 92 C330 102 302 116 278 134" },
  { x: 80, y: 222, link: "M110 238 C150 230 178 196 202 170" },
  { x: 400, y: 226, link: "M370 240 C330 230 302 196 278 170" },
];

const PACKETS: [number, number][] = [
  [156, 108],
  [324, 106],
  [170, 196],
];

/** Homestead clusters joined by dotted links to a hexagonal clinic node, with reports in transit. */
export function ConnectedVillages(props: IllustrationProps) {
  return (
    <Frame viewBox="0 0 480 300" {...props}>
      <rect x="2" y="2" width="476" height="296" rx="28" fill={C.b50} />
      <path d="M240 62 L316 106 L316 194 L240 238 L164 194 L164 106 Z" fill={C.b100} />
      {VILLAGES.map((v) => (
        <path key={v.link} d={v.link} stroke={C.b400} strokeWidth="3.5" strokeDasharray="1 9" strokeLinecap="round" fill="none" />
      ))}
      {VILLAGES.map((v, i) => (
        <g key={v.link}>
          <ellipse cx={v.x} cy={v.y + 26} rx="54" ry="15" fill={i % 2 ? C.b200 : C.b300} opacity="0.75" />
          <Hut x={v.x - 16} y={v.y + 10} s={0.8} roof={i % 2 ? C.b600 : C.b900} wall={C.white} />
          <Hut x={v.x + 22} y={v.y + 16} s={0.6} roof={i % 2 ? C.b900 : C.b600} wall={C.white} />
        </g>
      ))}
      {PACKETS.map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="11" fill={C.amberSoft} />
          <circle cx={x} cy={y} r="5.5" fill={C.amber} />
        </g>
      ))}
      {/* clinic / server node */}
      <path d="M240 104 L280 127 L280 173 L240 196 L200 173 L200 127 Z" fill={C.b600} />
      <path d="M240 104 L280 127 L280 138 L240 115 L200 138 L200 127 Z" fill={C.b500} />
      <rect x="233" y="130" width="14" height="44" rx="4" fill={C.white} />
      <rect x="218" y="145" width="44" height="14" rx="4" fill={C.white} />
      <circle cx="280" cy="127" r="9" fill={C.amber} stroke={C.b50} strokeWidth="4" />
    </Frame>
  );
}
