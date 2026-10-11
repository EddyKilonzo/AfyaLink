import { Acacia, C, Frame, type IllustrationProps } from "./frame";

/** Faceless, geometric figure: head, rounded body, optional headwrap. */
function Figure({ x, y, s = 1, body, wrap }: { x: number; y: number; s?: number; body: string; wrap?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-8 60 L-8 92 M8 60 L8 92" stroke={C.b900} strokeWidth="8" strokeLinecap="round" />
      <path d="M-20 64 C-22 26 -14 6 0 4 C14 6 22 26 20 64 Z" fill={body} />
      <circle cx="0" cy="-10" r="13" fill={C.b900} />
      {wrap && <path d="M-14 -12 C-12 -28 12 -28 14 -12 Z" fill={wrap} />}
    </g>
  );
}

/** A small community gathering at a water point under an acacia tree. */
export function CommunityCare(props: IllustrationProps) {
  return (
    <Frame viewBox="0 0 480 300" {...props}>
      <rect x="2" y="2" width="476" height="296" rx="28" fill={C.b50} />
      <circle cx="402" cy="72" r="26" fill={C.amber} />
      <circle cx="402" cy="72" r="40" fill={C.amber} opacity="0.18" />
      <path d="M2 210 C120 186 260 196 478 204 V270 a28 28 0 0 1 -28 28 H30 a28 28 0 0 1 -28 -28 Z" fill={C.b200} />
      <path d="M2 246 C140 232 320 236 478 244 V270 a28 28 0 0 1 -28 28 H30 a28 28 0 0 1 -28 -28 Z" fill={C.b300} />
      <Acacia x={136} y={214} s={2.1} />
      {/* water point: tank on a stand, tap, jerrycan */}
      <g>
        <rect x="336" y="118" width="64" height="50" rx="10" fill={C.b600} />
        <rect x="336" y="130" width="64" height="6" fill={C.b500} />
        <path d="M344 168 L340 226 M392 168 L396 226" stroke={C.b900} strokeWidth="6" strokeLinecap="round" />
        <path d="M368 168 V196 h14" stroke={C.b900} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="382" cy="208" r="3" fill={C.b400} />
        <rect x="370" y="216" width="26" height="22" rx="5" fill={C.amber} />
        <rect x="376" y="211" width="8" height="6" rx="2" fill={C.amber} />
      </g>
      <Figure x={206} y={156} body={C.b600} wrap={C.amber} />
      <Figure x={256} y={166} s={0.88} body={C.b900} />
      <Figure x={300} y={160} s={0.95} body={C.b400} wrap={C.b200} />
      {/* clipboard held by the first figure */}
      <rect x="218" y="182" width="20" height="26" rx="3" fill={C.white} stroke={C.b900} strokeWidth="2" />
      <path d="M223 192 h10 M223 199 h7" stroke={C.b400} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="256" cy="252" rx="90" ry="7" fill={C.b900} opacity="0.12" />
    </Frame>
  );
}
