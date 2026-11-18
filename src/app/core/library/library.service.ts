import { rxResource } from '@angular/core/rxjs-interop';
import { computed, Service, inject } from '@angular/core';
import { LibraryFile } from './library-file.model';
import { AuthService } from '../auth/auth.service';
import { DriveService } from '../drive/drive.service';

/**
 * Loads and exposes the user's library from `library.json` in Google Drive.
 *
 * The resource is enabled while the user is signed in; its loading state and
 * any load error are exposed alongside computed album and track collections.
 */
@Service()
export class LibraryService {
    private readonly authService = inject(AuthService);
    private readonly driveService = inject(DriveService);
    private readonly libraryFile = rxResource({
        params: () => this.authService.isSignedIn() ? true : undefined,
        stream: () => this.driveService.readJsonByName<LibraryFile>('library.json'),
    });

    /** Whether the library resource is currently loading. */
    readonly isLoading = this.libraryFile.isLoading;

    /** The error from the most recent library load, if one occurred. */
    readonly error = this.libraryFile.error;

    private readonly albumsById = computed(() => this.libraryFile.value()?.albums ?? {});
    private readonly tracksById = computed(() => this.libraryFile.value()?.tracks ?? {});

    /** All loaded albums as an array; empty until album data is available. */
    readonly albums = computed(() => Object.values(this.albumsById()));

    /** All loaded tracks as an array; empty until track data is available. */
    readonly tracks = computed(() => Object.values(this.tracksById()));

    /**
     * Finds an album by its ID.
     *
     * @param albumId ID of the album to find.
     * @returns The matching album, or `undefined` if it is not in the loaded library.
     */
    getAlbumById(albumId: string) {
        return this.albumsById()[albumId];
    }

    /**
     * Returns the tracks associated with an album.
     *
     * @param albumId ID of the album whose tracks to retrieve.
     * @returns The matching tracks, or an empty array if the album is not loaded.
     */
    getAlbumTracks(albumId: string) {
        const album = this.getAlbumById(albumId);
        if (!album) {
            return [];
        }
        return Object.values(this.tracksById()).filter((track) => track.albumId === albumId);
    }
}
