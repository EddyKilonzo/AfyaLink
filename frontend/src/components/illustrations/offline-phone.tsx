import { C, Frame, type IllustrationProps } from "./frame";

const CARDS = [
  { y: 84, w: 64 },
  { y: 132, w: 52 },
  { y: 180, w: 60 },
];

const AMBER_INK = "#85560f";

/** A phone holding saved reports while the connection is down. */
export function OfflinePhone(props: IllustrationProps) {
  return (
    <Frame viewBox="0 0 320 280" {...props}>
      <ellipse cx="160" cy="264" rx="112" ry="11" fill={C.b100} />
      <rect x="40" y="76" width="90" height="120" rx="14" fill={C.b200} transform="rotate(-12 85 136)" />
      <rect x="56" y="84" width="90" height="120" rx="14" fill={C.b100} transform="rotate(-5 101 144)" />
      <rect x="104" y="22" width="132" height="238" rx="24" fill={C.b900} />
      <rect x="114" y="34" width="112" height="214" rx="16" fill={C.canvas} />
      <rect x="148" y="41" width="44" height="6" rx="3" fill={C.b900} opacity="0.2" />
      <rect x="126" y="60" width="50" height="10" rx="5" fill={C.b600} />
      {CARDS.map((c) => (
        <g key={c.y}>
          <rect x="123" y={c.y} width="94" height="40" rx="10" fill={C.white} stroke={C.b100} strokeWidth="2" />
          <rect x="133" y={c.y + 10} width={c.w} height="7" rx="3.5" fill={C.b900} opacity="0.75" />
          <rect x="133" y={c.y + 23} width={c.w - 18} height="6" rx="3" fill={C.muted} opacity="0.35" />
          <circle cx="204" cy={c.y + 20} r="6" fill={C.amber} />
        </g>
      ))}
      <rect x="133" y="230" width="74" height="8" rx="4" fill={C.b200} />
      {/* cloud-off badge */}
      <circle cx="238" cy="54" r="36" fill={C.amberSoft} stroke={C.white} strokeWidth="5" />
      <path
        d="M224 66 h28 a10 10 0 0 0 1 -20 a14 14 0 0 0 -27 -3 a11.5 11.5 0 0 0 -2 23 Z"
        fill="none"
        stroke={AMBER_INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M218 34 L260 74" stroke={C.amberSoft} strokeWidth="10" strokeLinecap="round" />
      <path d="M218 34 L260 74" stroke={AMBER_INK} strokeWidth="4.5" strokeLinecap="round" />
    </Frame>
  );
}
