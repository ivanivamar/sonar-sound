import { Component, inject, input, output } from '@angular/core';
import { ArtistFile } from '../../../core/library/library-file.model';
import { Cover } from '../../../shared/media/cover/cover';
import { CoverColorService } from '../../../core/cover/cover-color.service';
import { rxResource } from '@angular/core/rxjs-interop';

@Component({
    imports: [Cover],
    selector: 'app-artist-card',
    styleUrl: './artist-card.scss',
    templateUrl: './artist-card.html',
})
export class ArtistCard {
    private readonly coverColorService = inject(CoverColorService);
    artist = input.required<ArtistFile>();
    artistClick = output<string>();

    private readonly coverColor = rxResource({
        params: () => this.artist()?.image?.id ?? undefined,
        stream: ({ params }) => this.coverColorService.getColor(params),
    });

    goToArtist() {
        this.artistClick.emit(this.artist().id);
    }
}
