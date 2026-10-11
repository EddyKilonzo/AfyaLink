import { Acacia, C, Frame, Hut, useIllustrationIds, type IllustrationProps } from "./frame";

/** A stylised, faceless volunteer walking a path between homesteads, phone in hand. */
export function VolunteerField(props: IllustrationProps) {
  const id = useIllustrationIds();
  return (
    <Frame viewBox="0 0 480 320" {...props}>
      <defs>
        <clipPath id={id("clip")}>
          <rect width="480" height="320" rx="28" />
        </clipPath>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.b100} />
          <stop offset="100%" stopColor={C.b200} />
        </linearGradient>
        <radialGradient id={id("sun")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={C.amber} stopOpacity="1" />
          <stop offset="60%" stopColor={C.amber} stopOpacity="0.85" />
          <stop offset="100%" stopColor={C.amber} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${id("clip")})`}>
        <rect width="480" height="320" fill={`url(#${id("sky")})`} />
        <circle cx="372" cy="86" r="70" fill={`url(#${id("sun")})`} />
        <circle cx="372" cy="86" r="34" fill={C.amber} />
        <path d="M120 70 h40 M132 84 h22" stroke={C.white} strokeWidth="8" strokeLinecap="round" opacity="0.85" />

        <path d="M0 176 C70 132 140 138 210 160 S350 120 480 150 V320 H0 Z" fill={C.b200} />
        <Hut x={74} y={170} s={0.75} roof={C.b600} />
        <path d="M0 214 C90 178 170 190 250 206 S400 176 480 196 V320 H0 Z" fill={C.b300} />
        <Hut x={300} y={196} s={0.9} />
        <Hut x={346} y={202} s={0.7} roof={C.b600} />
        <Acacia x={420} y={222} s={1.05} />
        <path d="M0 252 C110 226 210 232 300 246 S420 236 480 244 V320 H0 Z" fill={C.b400} />
        <path d="M0 286 C120 266 250 270 480 282 V320 H0 Z" fill={C.b500} />
        <path d="M150 320 C180 290 230 266 290 250 S360 232 400 226" stroke={C.b50} strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.5" />

        {/* volunteer: faceless, simple shapes only */}
        <g transform="translate(200 166)">
          <ellipse cx="6" cy="104" rx="30" ry="6" fill={C.b900} opacity="0.2" />
          <path d="M0 62 L-12 100 M12 62 L26 98" stroke={C.b900} strokeWidth="9" strokeLinecap="round" />
          <path d="M-10 22 C-20 38 -18 48 -12 56" stroke={C.b900} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M-14 68 C-16 30 -10 8 6 6 C22 8 28 30 26 68 Z" fill={C.b600} />
          <path d="M-6 9 L18 60" stroke={C.amber} strokeWidth="5" strokeLinecap="round" />
          <rect x="12" y="54" width="16" height="14" rx="4" fill={C.amber} />
          <path d="M18 18 C28 28 36 30 40 22" stroke={C.b900} strokeWidth="7" strokeLinecap="round" fill="none" />
          <rect x="36" y="4" width="13" height="22" rx="3" fill={C.b950} />
          <rect x="38.5" y="7" width="8" height="13" rx="1.5" fill={C.b100} />
          <circle cx="6" cy="-10" r="14" fill={C.b900} />
          <path d="M-9 -13 C-6 -29 18 -29 21 -13 Z" fill={C.amber} />
        </g>

        {/* the report leaves the phone as a link */}
        <path d="M246 170 C270 136 290 118 314 104" stroke={C.b600} strokeWidth="2.5" strokeDasharray="1 7" strokeLinecap="round" fill="none" />
        <g transform="rotate(-45 322 92)" fill="none" strokeWidth="5">
          <rect x="300" y="84" width="26" height="15" rx="7.5" stroke={C.b900} />
          <rect x="318" y="84" width="26" height="15" rx="7.5" stroke={C.b500} />
        </g>
      </g>
    </Frame>
  );
}