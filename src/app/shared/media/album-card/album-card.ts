import { Component, input, output, inject } from '@angular/core';
import { CoverColorService } from '../../../core/cover/cover-color.service';
import { AlbumFile } from '../../../core/library/library-file.model';
import { Cover } from '../../../shared/media/cover/cover';
import { CoverPlaceholder } from '../../../shared/media/cover/cover-placeholder';
import { rxResource } from '@angular/core/rxjs-interop';

@Component({
    imports: [Cover, CoverPlaceholder],
    selector: 'app-album-card',
    styleUrl: './album-card.scss',
    templateUrl: './album-card.html',
})
export class AlbumCard {
    private readonly coverColorService = inject(CoverColorService);
    album = input.required<AlbumFile>();
    albumClick = output<string>();

    private readonly coverColor = rxResource({
        params: () => this.album()?.cover ?? undefined,
        stream: ({ params }) => this.coverColorService.getColor(params),
    });

    goToAlbum() {
        this.albumClick.emit(this.album().id);
    }
}
