import { C, Frame, type IllustrationProps } from "./frame";

const PACKETS: [number, number][] = [
  [118, 56],
  [178, 36],
];

/**
 * Phone sending reports along an arc to a cloud that confirms them.
 * Works on both light and deep-green surfaces.
 */
export function SyncUpload(props: IllustrationProps) {
  return (
    <Frame viewBox="0 0 360 200" {...props}>
      <path d="M76 104 C108 30 228 18 270 86" stroke={C.b300} strokeWidth="3.5" strokeDasharray="1 10" strokeLinecap="round" fill="none" />
      <path d="M256 74 L271 88 L251 92" stroke={C.b300} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {PACKETS.map(([x, y]) => (
        <rect key={x} x={x - 8} y={y - 8} width="16" height="16" rx="5" fill={C.amber} transform={`rotate(20 ${x} ${y})`}>
          <animateTransform attributeName="transform" type="rotate" from={`20 ${x} ${y} 0`} to={`20 ${x} ${y} 0`} dur="2.6s" repeatCount="indefinite" />
        </rect>
      ))}
      <rect x="34" y="94" width="70" height="100" rx="14" fill={C.b900} stroke={C.b300} strokeWidth="2" />
      <rect x="42" y="104" width="54" height="80" rx="9" fill={C.b100} />
      <rect x="48" y="114" width="42" height="14" rx="4" fill={C.white} />
      <rect x="48" y="134" width="42" height="14" rx="4" fill={C.white} />
      <rect x="48" y="154" width="30" height="14" rx="4" fill={C.b300} />
      <path d="M226 174 h88 a26 26 0 0 0 4 -52 a38 38 0 0 0 -72 -10 a30 30 0 0 0 -20 62 Z" fill={C.b100} />
      <path d="M244 174 h70 a26 26 0 0 0 14 -48 a28 28 0 0 1 -30 40 h-54 Z" fill={C.b200} />
      <circle cx="276" cy="142" r="21" fill={C.b500} />
      <path d="M266 142 l7 7 l13 -14" stroke={C.white} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Frame>
  );
}