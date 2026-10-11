import { C, Frame, type IllustrationProps } from "./frame";

/** Spot illustration for empty lists: an open tray with a blank report floating above it. */
export function EmptyInbox(props: IllustrationProps) {
  return (
    <Frame viewBox="0 0 160 120" {...props}>
      <path d="M80 8 L124 33 L124 83 L80 108 L36 83 L36 33 Z" fill={C.b50} />
      <rect x="56" y="18" width="48" height="56" rx="8" fill={C.white} stroke={C.b200} strokeWidth="2" transform="rotate(-6 80 46)" />
      <path d="M64 34 h26 M64 44 h20 M64 54 h24" stroke={C.b300} strokeWidth="4" strokeLinecap="round" transform="rotate(-6 80 46)" />
      <path d="M30 70 L46 58 H114 L130 70 V96 a8 8 0 0 1 -8 8 H38 a8 8 0 0 1 -8 -8 Z" fill={C.b600} />
      <path d="M30 70 H60 a20 10 0 0 0 40 0 H130 V96 a8 8 0 0 1 -8 8 H38 a8 8 0 0 1 -8 -8 Z" fill={C.b500} />
      <circle cx="122" cy="22" r="7" fill={C.amber} />
    </Frame>
  );
}
