import { Component, input, output } from '@angular/core';
import { AlbumFile } from '../../../core/library/library-file.model';
import { Cover } from '../cover/cover';

@Component({
    imports: [Cover],
    selector: 'app-album-card',
    styleUrl: './album-card.scss',
    templateUrl: './album-card.html',
})
export class AlbumCard {
    album = input.required<AlbumFile>();
    albumClick = output<string>();

    goToAlbum() {
        this.albumClick.emit(this.album().id);
    }
}
