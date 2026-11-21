import { Component, computed, input, output, signal } from '@angular/core';
import { CoverColor, glowColor } from '../../../core/cover/cover-color';
import { AlbumFile } from '../../../core/library/library-file.model';
import { Cover } from '../../../shared/media/cover/cover';
import { CoverPlaceholder } from '../../../shared/media/cover/cover-placeholder';

@Component({
    imports: [Cover, CoverPlaceholder],
    selector: 'app-album-card',
    styleUrl: './album-card.scss',
    templateUrl: './album-card.html',
})
export class AlbumCard {
    album = input.required<AlbumFile>();
    albumClick = output<string>();

    protected readonly extractedColor = signal<CoverColor | null>(null);
    // Without a colour from the library, the cover is sampled once it scrolls into view.
    protected readonly needsExtraction = computed(() => !this.album().coverColor);
    protected readonly glow = computed(() =>
        glowColor(this.album().coverColor ?? this.extractedColor()),
    );

    goToAlbum() {
        this.albumClick.emit(this.album().id);
    }
}
