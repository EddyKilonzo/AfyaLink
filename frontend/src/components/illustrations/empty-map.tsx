import { C, Frame, type IllustrationProps } from "./frame";

/** Spot illustration for empty maps or lost routes: a folded map, dotted path and a pin. */
export function EmptyMap(props: IllustrationProps) {
  return (
    <Frame viewBox="0 0 160 120" {...props}>
      <ellipse cx="80" cy="108" rx="58" ry="6" fill={C.b100} />
      <path d="M24 30 L58 20 L102 30 L136 20 V92 L102 102 L58 92 L24 102 Z" fill={C.b100} />
      <path d="M58 20 L102 30 V102 L58 92 Z" fill={C.b200} />
      <path d="M24 30 L58 20 V92 L24 102 Z" fill={C.b50} />
      <path d="M36 86 C52 70 66 82 80 66 S108 60 112 48" stroke={C.b600} strokeWidth="3" strokeDasharray="1 7" strokeLinecap="round" fill="none" />
      <circle cx="36" cy="86" r="4" fill={C.b600} />
      <path d="M112 54 C102 42 100 36 100 32 a12 12 0 0 1 24 0 c0 4 -2 10 -12 22 Z" fill={C.amber} />
      <circle cx="112" cy="32" r="4.5" fill={C.white} />
    </Frame>
  );
}
