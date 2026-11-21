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

    readonly isCurrentPlaying = computed(() => this.playerService.currentTrack() === this.track() && this.playerService.isPlaying());

    play(event: Event) {
        event.stopPropagation();

        if (this.playerService.isBuffering()) return;

        if (this.playerService.currentTrack()?.id === this.track().id) {
            this.playerService.toggle();
        } else {
            console.log('Playing track:', this.track());
            void this.playerService.playTrack(this.track());
        }
    }
}
