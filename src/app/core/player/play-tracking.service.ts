import { PlayTracker } from './play-tracker';
import { inject, Service } from '@angular/core';
import { PlaybackProgress } from './play-tracker';
import { PlayHistoryService } from './play-history.service';

@Service()
export class PlayTrackingService {
    private readonly history = inject(PlayHistoryService);

    private tracker: PlayTracker | null = null;
    private trackId: string | null = null;
    private startedAt = 0;
    private readonly progress = new PlaybackProgress();

    start(trackId: string, startedAt: number, duration: number): void {
        this.progress.stop();
        this.trackId = trackId;
        this.startedAt = startedAt;
        this.tracker = new PlayTracker();
        this.tracker.setDuration(duration);
    }

    setDuration(duration: number): void {
        if (this.tracker?.setDuration(duration)) {
            this.record();
        }
    }

    addHeard(seconds: number): void {
        if (this.tracker?.addHeard(seconds)) {
            this.record();
        }
    }

    clear(): void {
        this.progress.stop();
        this.tracker = null;
        this.trackId = null;
    }

    resumeProgress(position: number, time: number, rate: number): void {
        this.progress.start(position, time, rate);
    }

    sampleProgress(position: number, time: number, rate: number): void {
        this.addHeard(this.progress.sample(position, time, rate));
    }

    stopProgress(): void {
        this.progress.stop();
    }

    private record(): void {
        if (this.trackId !== null) {
            this.history.record(this.trackId, this.startedAt);
        }
    }
}
