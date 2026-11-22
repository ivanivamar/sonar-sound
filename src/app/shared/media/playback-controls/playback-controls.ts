import { Component, computed, inject } from '@angular/core';
import { PlayerService } from '../../../core/player/player.service';
import { Ripple } from '../../directives/ripple';

@Component({
    imports: [Ripple],
    selector: 'app-playback-controls',
    styleUrl: './playback-controls.scss',
    templateUrl: './playback-controls.html',
})
export class PlaybackControls {
    protected readonly playerService = inject(PlayerService);

    protected readonly playIcon = computed(() => {
        if (this.playerService.isBuffering()) return 'autorenew';
        return this.playerService.isPlaying() ? 'pause' : 'play_arrow';
    });

    protected toggle(event: Event): void {
        // The mini player toggles the full-screen player when clicked.
        event.stopPropagation();
        this.playerService.toggle();
    }
}
