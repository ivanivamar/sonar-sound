import { Component, computed, inject, input } from '@angular/core';
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
    showArtist = input(true);
    showAlbum = input(true);

    readonly isCurrent = computed(() => this.playerService.currentTrack()?.id === this.track().id);
    readonly isCurrentPlaying = computed(() => this.isCurrent() && this.playerService.isPlaying());
    readonly isCurrentBuffering = computed(() => this.isCurrent() && this.playerService.isBuffering());
    readonly icon = computed(() =>
        this.isCurrentBuffering() ? 'autorenew' : this.isCurrentPlaying() ? 'pause' : 'play_arrow',
    );
    readonly playLabel = computed(
        () => `${this.isCurrentPlaying() ? 'Pause' : 'Play'} ${this.track().title}`,
    );

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

    play(event: Event) {
        event.stopPropagation();

        if (this.isCurrent()) {
            this.playerService.toggle();
        } else {
            void this.playerService.playTrack(this.track());
        }
    }
}
