import { Component, input, output } from '@angular/core';
import { AlbumFile } from '../../../core/library/library-file.model';
import { AlbumCard } from '../../../shared/components/album-card/album-card';

@Component({
    imports: [AlbumCard],
    selector: 'app-albums',
    styleUrl: './albums.scss',
    templateUrl: './albums.html',
})
export class Albums {
    readonly albums = input.required<AlbumFile[]>();
    albumClick = output<string>();
}
