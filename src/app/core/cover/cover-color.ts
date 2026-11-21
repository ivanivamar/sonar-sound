export interface CoverColor {
    /** hue angle in OKLCH, 0–360 */
    hue: number;
    /** 0–1: how colourful the cover is (0 → neutral, near-white accents) */
    chroma: number;
}

export const NEUTRAL: CoverColor = { hue: 40, chroma: 0 };

/** CSS colour for a cover's glow, or transparent while the colour is unknown. */
export function glowColor(color: CoverColor | null | undefined): string {
    return color ? `oklch(65% ${color.chroma * 0.18} ${color.hue} / 0.65)` : 'transparent';
}

type Rgb = readonly [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** sRGB (0–255) → OKLCH [lightness, chroma, hue] */
export function toOklch([r8, g8, b8]: Rgb): [number, number, number] {
    const [r, g, b] = [r8, g8, b8].map((v) => toLinear(v / 255));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

const BUCKETS = 24;

/** The cover's dominant colour from its pixels (RGBA, e.g. 32×32 from getImageData). */
export function dominantColor(pixels: Uint8ClampedArray): CoverColor {
    const weight = new Float64Array(BUCKETS);
    const sums = Array.from({ length: BUCKETS }, () => [0, 0, 0]);
    let greyCount = 0;

    for (let i = 0; i < pixels.length; i += 4) {
        const rgb: Rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
        const [L, C, H] = toOklch(rgb);
        if (L < 0.12 || L > 0.97 || C < 0.025) {
            greyCount++;
            continue;
        }
        const bucket = Math.floor(H / (360 / BUCKETS)) % BUCKETS;
        const w = C * (1 - Math.abs(L - 0.55)); // colourful mid-tones count most
        weight[bucket] += w;
        sums[bucket][0] += rgb[0] * w;
        sums[bucket][1] += rgb[1] * w;
        sums[bucket][2] += rgb[2] * w;
    }

    let best = 0;
    for (let k = 1; k < BUCKETS; k++) if (weight[k] > weight[best]) best = k;

    const greyShare = greyCount / (pixels.length / 4);
    const colourful = weight[best] > 0.6 && (greyShare < 0.7 || weight[best] > 12);
    if (!colourful) return NEUTRAL;

    const avg = sums[best].map((v) => Math.round(v / weight[best])) as unknown as Rgb;
    const [, C, H] = toOklch(avg);
    return C < 0.03 ? NEUTRAL : { hue: Math.round(H), chroma: Math.min(1, (C - 0.03) / 0.05) };
}