export function playThreshold(duration: number): number {
    if (!Number.isFinite(duration) || duration <= 0) {
        return 30;
    }

    return Math.min(30, duration / 2);
}

export class PlayTracker {
    private listened = 0;
    private duration = NaN;
    private counted = false;

    setDuration(duration: number): boolean {
        this.duration = duration;
        return this.checkThreshold();
    }

    addHeard(seconds: number): boolean {
        if (!Number.isFinite(seconds) || seconds < 0) {
            throw new RangeError('Heard time must be a non-negative number.');
        }

        this.listened += seconds;
        return this.checkThreshold();
    }

    private checkThreshold(): boolean {
        if (this.counted || this.listened < playThreshold(this.duration)) {
            return false;
        }

        this.counted = true;
        return true;
    }
}

export function heardBetween(
    previousPosition: number,
    currentPosition: number,
    elapsedSeconds: number,
    playbackRate: number,
): number {
    if (
        !Number.isFinite(previousPosition) ||
        !Number.isFinite(currentPosition) ||
        !Number.isFinite(elapsedSeconds) ||
        elapsedSeconds < 0 ||
        !Number.isFinite(playbackRate) ||
        playbackRate <= 0
    ) {
        throw new RangeError('Invalid playback sample.');
    }

    const progress = currentPosition - previousPosition;
    const possibleProgress = elapsedSeconds * playbackRate;

    // Allow a little timing jitter, but reject larger jumps.
    if (progress <= 0 || progress > possibleProgress + 0.25) return 0;

    return Math.min(progress, possibleProgress);
}

export class PlaybackProgress {
    private baseline: {
        position: number;
        time: number;
        rate: number;
    } | null = null;

    start(position: number, time: number, rate: number): void {
        this.validate(position, time, rate);
        this.baseline = { position, time, rate };
    }

    sample(position: number, time: number, rate: number): number {
        this.validate(position, time, rate);
        const previous = this.baseline;
        if (!previous) return 0;

        const elapsed = (time - previous.time) / 1000;
        const heard = heardBetween(previous.position, position, elapsed, previous.rate);
        this.baseline = { position, time, rate };
        return heard;
    }

    stop(): void {
        this.baseline = null;
    }

    private validate(position: number, time: number, rate: number): void {
        if (
            !Number.isFinite(position) ||
            !Number.isFinite(time) ||
            !Number.isFinite(rate) ||
            rate <= 0
        ) {
            throw new RangeError('Invalid playback sample.');
        }
    }
}
