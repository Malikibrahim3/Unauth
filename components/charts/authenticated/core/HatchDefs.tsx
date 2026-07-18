import { HATCH_PITCH } from './geometry';
import type { AuthChartTone } from '../types';

export type HatchHue = Exclude<AuthChartTone, 'yellow'> | 'orange' | 'blue' | 'green' | 'violet' | 'red' | 'neutral';

const HUES: HatchHue[] = ['orange', 'blue', 'green', 'violet', 'red', 'neutral'];

/**
 * Shared SVG hatch patterns for T2. One `<pattern>` per hue, 1px stroke / 5px pitch / 45°.
 * `neutral` renders at the remainder/unavailable opacity (55%); every other hue renders
 * at the area-wash opacity (40%) per §1 T2 — render once per SVG chart via <HatchDefs />.
 */
export function HatchDefs({ id = 'ua-hatch' }: { id?: string }) {
  return (
    <defs>
      {HUES.map((hue) => (
        <pattern
          key={hue}
          id={`${id}-${hue}`}
          patternUnits="userSpaceOnUse"
          width={HATCH_PITCH}
          height={HATCH_PITCH}
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={HATCH_PITCH}
            stroke={`var(--ua-chart-${hue})`}
            strokeWidth={1}
            strokeOpacity={hue === 'neutral' ? 0.55 : 0.4}
          />
        </pattern>
      ))}
      <linearGradient id="ua-hatch-falloff" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="black" stopOpacity={0.85} />
        <stop offset="100%" stopColor="black" stopOpacity={0.1} />
      </linearGradient>
      <mask id="ua-hatch-falloff-mask" maskContentUnits="objectBoundingBox">
        <rect width="1" height="1" fill="url(#ua-hatch-falloff)" />
      </mask>
    </defs>
  );
}

export function hatchFill(hue: HatchHue, id = 'ua-hatch'): string {
  return `url(#${id}-${hue})`;
}
