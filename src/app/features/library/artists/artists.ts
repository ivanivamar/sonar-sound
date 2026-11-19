import { Component, input, output } from '@angular/core';
import { ArtistCard } from '../../../shared/components/artist-card/artist-card';
import { ArtistFile } from '../../../core/library/library-file.model';

@Component({
    imports: [ArtistCard],
    selector: 'app-artists',
    styleUrl: './artists.scss',
    templateUrl: './artists.html',
})
export class Artists {
    readonly artists = input.required<ArtistFile[]>();
    artistClick = output<string>();
}
