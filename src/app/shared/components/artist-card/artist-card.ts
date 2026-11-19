import { Component, input, output } from '@angular/core';
import { ArtistFile } from '../../../core/library/library-file.model';
import { Cover } from '../cover/cover';

@Component({
    imports: [Cover],
    selector: 'app-artist-card',
    styleUrl: './artist-card.scss',
    templateUrl: './artist-card.html',
})
export class ArtistCard {

    artist = input.required<ArtistFile>();
    artistClick = output<string>();

    goToArtist() {
        this.artistClick.emit(this.artist().id);
    }
}
