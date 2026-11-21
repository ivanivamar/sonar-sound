import { Component, computed, input, output, signal } from '@angular/core';
import { ArtistFile } from '../../../core/library/library-file.model';
import { Cover } from '../../../shared/media/cover/cover';
import { CoverColor, glowColor } from '../../../core/cover/cover-color';
import { artistCoverId } from '../../../core/cover/cover-id';

@Component({
    imports: [Cover],
    selector: 'app-artist-card',
    styleUrl: './artist-card.scss',
    templateUrl: './artist-card.html',
})
export class ArtistCard {
    artist = input.required<ArtistFile>();
    artistClick = output<string>();

    protected readonly coverId = computed(() => artistCoverId(this.artist()));
    protected readonly extractedColor = signal<CoverColor | null>(null);
    // Without a colour from the library, the image is sampled once it scrolls into view.
    protected readonly needsExtraction = computed(() => !this.artist().image?.color);
    protected readonly glow = computed(() =>
        glowColor(this.artist().image?.color ?? this.extractedColor()),
    );

    goToArtist() {
        this.artistClick.emit(this.artist().id);
    }
}
