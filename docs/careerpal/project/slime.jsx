// CareerPal companion — exact provided SVGs + subtle breathing & blinking
// States: idle | listening | waiting | thinking | speaking/answering | happy | sleeping
// Color: #5367F3

const SLIME_FILL = "#5367F3";
const SLIME_DARK = "#0B123D";

/* Breathing wrap — subtle scale around the center (256, 256) */
const Breathe = ({ children, intensity = 1, dur = 3.2 }) => {
  const min = 1 - 0.012 * intensity;
  const max = 1 + 0.018 * intensity;
  return (
    <g style={{ transformOrigin: "256px 290px", transformBox: "fill-box" }}>
      <animateTransform
        attributeName="transform"
        type="scale"
        values={`${min};${max};${min}`}
        dur={`${dur}s`}
        repeatCount="indefinite"
        additive="sum"
      />
      {children}
    </g>
  );
};

/* Blinking eye — narrows ry on a periodic schedule */
const BlinkEye = ({ x, y, w = 18, h = 39, rx = 9, transform, blink = true, delay = 0 }) => {
  return (
    <rect x={x} y={y} width={w} height={h} rx={rx} fill={SLIME_DARK} transform={transform}>
      {blink && (
        <animate
          attributeName="height"
          values={`${h};${h};${h};1;${h};${h}`}
          keyTimes="0;0.85;0.92;0.94;0.97;1"
          dur="4.5s"
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      )}
      {blink && (
        <animate
          attributeName="y"
          values={`${y};${y};${y};${y + h / 2};${y};${y}`}
          keyTimes="0;0.85;0.92;0.94;0.97;1"
          dur="4.5s"
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      )}
    </rect>
  );
};

/* ────────── Bodies ────────── */
const SlimeIdle = () => (
  <Breathe>
    <path fill={SLIME_FILL} d="M256 105C340 105 407 169 407 253C407 337 338 407 251 407C165 407 105 342 105 255C105 169 171 105 256 105Z" />
    <BlinkEye x="205" y="238" />
    <BlinkEye x="288" y="238" delay="0.08" />
  </Breathe>
);

const SlimeListening = () => (
  <Breathe intensity={1.2} dur={2.8}>
    <path fill={SLIME_FILL} d="M155 363C95 312 97 218 161 149C226 80 309 87 345 133C376 173 350 218 383 271C417 326 374 395 286 404C232 410 190 393 155 363Z" />
    <BlinkEye x="206" y="239" w={18} h={38} transform="rotate(-9 215 258)" />
    <BlinkEye x="281" y="230" w={18} h={38} transform="rotate(-9 290 249)" delay="0.08" />
    {/* Sound waves with a soft pulse */}
    <g>
      <path d="M390 135C414 154 427 180 428 211" fill="none" stroke={SLIME_FILL} strokeWidth="18" strokeLinecap="round">
        <animate attributeName="opacity" values="0.55;1;0.55" dur="1.6s" repeatCount="indefinite" />
      </path>
      <path d="M365 160C379 172 387 190 388 211" fill="none" stroke={SLIME_FILL} strokeWidth="14" strokeLinecap="round">
        <animate attributeName="opacity" values="1;0.5;1" dur="1.6s" repeatCount="indefinite" />
      </path>
    </g>
  </Breathe>
);

const SlimeThinking = () => (
  <Breathe intensity={0.9} dur={2.6}>
    <path fill={SLIME_FILL} d="M256 101C342 101 410 169 410 256C410 343 342 411 256 411C170 411 102 343 102 256C102 169 170 101 256 101Z">
      {/* tiny squish loop */}
      <animate attributeName="d"
        values="M256 101C342 101 410 169 410 256C410 343 342 411 256 411C170 411 102 343 102 256C102 169 170 101 256 101Z;
                M256 99C344 101 412 171 410 258C408 345 344 413 256 413C168 413 100 343 102 254C104 167 168 97 256 99Z;
                M256 101C342 101 410 169 410 256C410 343 342 411 256 411C170 411 102 343 102 256C102 169 170 101 256 101Z"
        dur="3.6s" repeatCount="indefinite" />
    </path>
    <BlinkEye x="209" y="239" />
    <BlinkEye x="289" y="239" delay="0.08" />
    {/* Side arcs with offset pulses */}
    <g>
      <path d="M57 209C43 223 36 239 36 258C36 277 43 293 57 307" fill="none" stroke={SLIME_FILL} strokeWidth="15" strokeLinecap="round">
        <animate attributeName="opacity" values="0.35;1;0.35" dur="1.8s" repeatCount="indefinite" />
      </path>
      <path d="M84 225C76 234 72 244 72 258C72 272 76 282 84 291" fill="none" stroke={SLIME_FILL} strokeWidth="13" strokeLinecap="round">
        <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite" />
      </path>
      <path d="M455 209C469 223 476 239 476 258C476 277 469 293 455 307" fill="none" stroke={SLIME_FILL} strokeWidth="15" strokeLinecap="round">
        <animate attributeName="opacity" values="0.35;1;0.35" dur="1.8s" begin="0.2s" repeatCount="indefinite" />
      </path>
      <path d="M428 225C436 234 440 244 440 258C440 272 436 282 428 291" fill="none" stroke={SLIME_FILL} strokeWidth="13" strokeLinecap="round">
        <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" begin="0.2s" repeatCount="indefinite" />
      </path>
    </g>
  </Breathe>
);

const SlimeAnswering = () => (
  <Breathe intensity={1.4} dur={2.4}>
    <path fill={SLIME_FILL} d="M121 247C124 204 159 188 188 165C218 142 221 99 273 99C318 99 333 139 352 165C371 190 408 202 410 255C414 334 352 403 262 405C180 407 115 343 121 247Z" />
    <BlinkEye x="205" y="239" w={18} h={38} />
    <BlinkEye x="278" y="235" w={18} h={38} delay="0.08" />
    {/* Floating thought bubbles */}
    <circle cx="370" cy="84" r="29" fill={SLIME_FILL}>
      <animate attributeName="cy" values="84;76;84" dur="2.4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.85;1;0.85" dur="2.4s" repeatCount="indefinite" />
    </circle>
    <circle cx="354" cy="145" r="16" fill={SLIME_FILL}>
      <animate attributeName="cy" values="145;138;145" dur="2.4s" begin="0.4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.7;1;0.7" dur="2.4s" begin="0.4s" repeatCount="indefinite" />
    </circle>
  </Breathe>
);

/* ────────── Wrapper ────────── */
const Slime = ({ size = 80, state = "idle" }) => {
  let Body;
  switch (state) {
    case "listening":
    case "waiting":
      Body = SlimeListening; break;
    case "thinking":
      Body = SlimeThinking; break;
    case "speaking":
    case "answering":
      Body = SlimeAnswering; break;
    case "idle":
    case "happy":
    case "sleeping":
    default:
      Body = SlimeListening; // No idle state — default to listening per design spec
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      style={{ display: "block", overflow: "visible" }}
    >
      <Body />
    </svg>
  );
};

window.Slime = Slime;
