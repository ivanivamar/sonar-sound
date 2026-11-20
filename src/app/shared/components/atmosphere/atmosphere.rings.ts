export interface Ring {
    /** resting shape */
    from: string;
    /** values for <animate>: rest → swell → rest */
    morph: string;
    opacity: number;
}

const CENTER_X = 1160;
const CENTER_Y = 890;
const POINTS = 64;

/** One organic ring around the centre: a wobble of three sine terms; `phase` shifts the wobble. */
function ringPath(radius: number, seed: number, phase: number): string {
    const parts: string[] = [];
    for (let i = 0; i <= POINTS; i++) {
        const a = (i / POINTS) * Math.PI * 2;
        const r =
            radius *
            (1 +
                0.075 * Math.sin(3 * a + seed + phase) +
                0.045 * Math.sin(5 * a - seed - phase * 1.4) +
                0.02 * Math.sin(8 * a + phase * 2));
        parts.push(`${i ? 'L' : 'M'}${(CENTER_X + Math.cos(a) * r * 1.3).toFixed(1)} ${(CENTER_Y + Math.sin(a) * r).toFixed(1)}`);
    }
    return parts.join(' ') + 'Z';
}

/** 13 rings, built once. */
export const RINGS: readonly Ring[] = Array.from({ length: 13 }, (_, k) => {
    const radius = 55 + k * 60;
    const seed = k * 1.37;
    const rest = ringPath(radius, seed, 0);
    const swell = ringPath(radius * 1.04, seed, 1.3);
    return { from: rest, morph: `${rest};${swell};${rest}`, opacity: Math.max(0.035, 0.13 - k * 0.007) };
});