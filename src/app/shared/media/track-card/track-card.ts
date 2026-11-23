import { Component, computed, inject, input, signal } from '@angular/core';
import { DurationPipe } from '../../pipes/duration-pipe';
import { TrackRow } from '../../../core/library/library-file.model';
import { RouterLink } from '@angular/router';
import { Ripple } from '../../directives/ripple';
import { PlayerService } from '../../../core/player/player.service';

@Component({
    imports: [DurationPipe, RouterLink, Ripple],
    selector: 'app-track-card',
    styleUrl: './track-card.scss',
    templateUrl: './track-card.html',
})
export class TrackCard {
    readonly playerService = inject(PlayerService);

    track = input.required<TrackRow>();
    queueTrackIds = input<readonly string[] | null>(null);
    showArtist = input(true);
    showAlbum = input(true);

    readonly isCurrent = computed(() => this.playerService.currentTrack()?.id === this.track().id);
    readonly isCurrentPlaying = computed(() => this.isCurrent() && this.playerService.isPlaying());
    readonly isCurrentBuffering = computed(
        () => this.isCurrent() && this.playerService.isBuffering(),
    );
    readonly icon = computed(() =>
        this.isCurrentBuffering() ? 'autorenew' : this.isCurrentPlaying() ? 'pause' : 'play_arrow',
    );
    readonly playLabel = computed(
        () => `${this.isCurrentPlaying() ? 'Pause' : 'Play'} ${this.track().title}`,
    );
    protected readonly queueError = signal<string | null>(null);

    playFromRow(event: MouseEvent) {
        if (event.target instanceof Element && event.target.closest('a')) {
            return;
        }
        this.play(event);
    }

    playFromKeyboard(event: KeyboardEvent) {
        if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) {
            return;
        }
        event.preventDefault();
        this.play(event);
    }

    play(event: Event): void {
        event.stopPropagation();
        this.queueError.set(null);

        if (this.isCurrent()) {
            this.playerService.toggle();
            return;
        }

        const ids = this.queueTrackIds();
        if (ids === null) {
            void this.playerService.playTrack(this.track());
            return;
        }

        const index = ids.indexOf(this.track().id);
        void this.playerService.playQueue(ids, index).catch((error: unknown) => {
            this.queueError.set(
                error instanceof Error ? error.message : 'Could not start the queue.',
            );
        });
    }
}
