import { PlayTrackingService } from './play-tracking.service';

export class AudioPlayTracking {
    private started = false;
    private advancing = false;
    private seeking = false;

    constructor(
        private readonly audio: HTMLAudioElement,
        private readonly tracking: PlayTrackingService,
        currentTrackId: () => string | null,
        hasSource: () => boolean,
    ) {
        audio.addEventListener('playing', () => {
            const trackId = currentTrackId();
            if (trackId === null || !hasSource() || audio.paused) return;

            if (!this.started) {
                tracking.start(trackId, Date.now(), audio.duration);
                this.started = true;
            }

            this.advancing = true;
            if (!this.seeking && !audio.seeking) this.resumeProgress();
        });

        audio.addEventListener('timeupdate', () => this.sample());
        audio.addEventListener('ratechange', () => this.sample());
        audio.addEventListener('durationchange', () => tracking.setDuration(audio.duration));

        const stopProgress = () => {
            this.sample();
            this.advancing = false;
            tracking.stopProgress();
        };
        audio.addEventListener('pause', stopProgress);
        audio.addEventListener('waiting', stopProgress);
        audio.addEventListener('error', stopProgress);

        audio.addEventListener('seeking', () => {
            this.seeking = true;
            tracking.stopProgress();
        });
        audio.addEventListener('seeked', () => {
            this.seeking = false;
            if (this.advancing && !audio.paused) this.resumeProgress();
        });
    }

    seek(seconds: number): void {
        if (seconds === this.audio.currentTime) return;

        this.sample();
        this.seeking = true;
        this.tracking.stopProgress();

        try {
            this.audio.currentTime = seconds;
        } catch (error) {
            this.seeking = false;
            if (this.advancing && !this.audio.seeking) this.resumeProgress();
            throw error;
        }
    }

    finish(): void {
        this.sample();
        this.tracking.clear();
        this.started = false;
        this.advancing = false;
        this.seeking = false;
    }

    private sample(): void {
        if (!this.advancing || this.seeking || this.audio.seeking) return;

        this.tracking.sampleProgress(
            this.audio.currentTime,
            performance.now(),
            this.audio.playbackRate,
        );
    }

    private resumeProgress(): void {
        this.tracking.resumeProgress(
            this.audio.currentTime,
            performance.now(),
            this.audio.playbackRate,
        );
    }
}
