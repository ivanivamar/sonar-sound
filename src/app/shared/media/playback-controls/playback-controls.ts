import { Component, computed, inject, signal } from '@angular/core';
import { PlayerService, RepeatMode } from '../../../core/player/player.service';
import { Ripple } from '../../directives/ripple';
import { QueueService } from '../../../core/player/queue/queue.service';

@Component({
    imports: [Ripple],
    selector: 'app-playback-controls',
    styleUrl: './playback-controls.scss',
    templateUrl: './playback-controls.html',
})
export class PlaybackControls {
    protected readonly playerService = inject(PlayerService);
    protected readonly queueService = inject(QueueService);

    protected readonly playIcon = computed(() => {
        if (this.playerService.isBuffering()) return 'autorenew';
        return this.playerService.isPlaying() ? 'pause' : 'play_arrow';
    });
    protected readonly controlError = signal<string | null>(null);
    protected readonly shuffleActive = computed(() => this.queueService.state().shuffle);

    protected toggle(event: Event): void {
        // The mini player toggles the full-screen player when clicked.
        event.stopPropagation();
        this.playerService.toggle();
    }

    protected previous(event: Event): void {
        event.stopPropagation();
        this.controlError.set(null);

        void this.playerService.previousTrack().catch((error: unknown) => {
            this.controlError.set(
                error instanceof Error ? error.message : 'Could not play the previous track.',
            );
        });
    }

    protected next(event: Event): void {
        event.stopPropagation();
        this.controlError.set(null);

        void this.playerService.nextTrack().catch((error: unknown) => {
            this.controlError.set(
                error instanceof Error ? error.message : 'Could not play the next track.',
            );
        });
    }

    protected toggleRepeat(event: Event): void {
        event.stopPropagation();
        this.playerService.toggleRepeat();
    }

    protected readonly repeatActive = computed(
        () => this.playerService.repeat() !== RepeatMode.Off,
    );

    protected readonly repeatIcon = computed(() =>
        this.playerService.repeat() === RepeatMode.One ? 'repeat_one' : 'repeat',
    );

    protected readonly repeatLabel = computed(() => {
        switch (this.playerService.repeat()) {
            case RepeatMode.One:
                return 'Repeat one';
            case RepeatMode.All:
                return 'Repeat all';
            default:
                return 'Repeat off';
        }
    });

    protected readonly shuffleLabel = computed(() =>
        this.shuffleActive() ? 'Shuffle on' : 'Shuffle off',
    );

    protected toggleShuffle(event: Event): void {
        event.stopPropagation();
        this.queueService.toggleShuffle();
    }
}
