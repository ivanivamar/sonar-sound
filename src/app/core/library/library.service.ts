import { rxResource } from '@angular/core/rxjs-interop';
import { computed, Service, inject } from '@angular/core';
import { ArtistFile, LibraryFile } from './library-file.model';
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
        params: () => (this.authService.isSignedIn() ? true : undefined),
        stream: () => this.driveService.readJsonByName<LibraryFile>('library.json'),
    });

    /** Whether the library resource is currently loading. */
    readonly isLoading = this.libraryFile.isLoading;

    /** The error from the most recent library load, if one occurred. */
    readonly error = this.libraryFile.error;

    private readonly albumsById = computed(() => this.libraryFile.value()?.albums ?? {});
    private readonly artistsById = computed(() => this.libraryFile.value()?.artists ?? {});
    private readonly tracksById = computed(() => this.libraryFile.value()?.tracks ?? {});

    readonly allCount = computed(() => this.albums().length + this.artists().length);

    /** All loaded albums as an array; empty until album data is available. */
    readonly albums = computed(() =>
        Object.values(this.albumsById()).sort(
            (a, b) => new Date(b.addedAt ?? 0).getTime() - new Date(a.addedAt ?? 0).getTime(),
        ),
    );

    /** All loaded artists as an array; empty until artist data is available. */
    readonly artists = computed(() => {
        const albumsByArtist = new Map<string, ArtistFile>();

        for (const album of this.albums()) {
            const existing = albumsByArtist.get(album.artistId);
            if (existing) {
                existing.albums++;
            } else {
                albumsByArtist.set(album.artistId, {
                    ...this.artistsById()[album.artistId],
                    albums: 1,
                });
            }
        }

        return [...albumsByArtist.values()].sort(
            (a, b) => new Date(b.addedAt ?? 0).getTime() - new Date(a.addedAt ?? 0).getTime(),
        );
    });

    /** All loaded tracks as an array; empty until track data is available. */
    readonly tracks = computed(() => Object.values(this.tracksById()));

    readonly trackRows = computed(() => {
        return Object.values(this.tracksById()).map((track) => {
            const album = this.getAlbumById(track.albumId);
            return {
                ...track,
                cover: album?.cover ?? null,
                albumTitle: album?.title ?? '',
            };
        });
    });

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

    /**
     * Finds an artist by its ID.
     *
     * @param artistId ID of the artist to find.
     * @returns The matching artist, or `undefined` if it is not in the loaded library.
     */
    getArtistById(artistId: string) {
        return this.artistsById()[artistId];
    }

    /**
     * Returns the albums associated with an artist.
     *
     * @param artistId ID of the artist whose albums to retrieve.
     * @returns The matching albums, or an empty array if the artist is not loaded.
     */
    getArtistAlbums(artistId: string) {
        return Object.values(this.albumsById())
            .filter((album) => album.artistId === artistId)
            .sort(
                (a, b) =>
                    (b.year ?? 0) - (a.year ?? 0) ||
                    new Date(b.addedAt ?? 0).getTime() - new Date(a.addedAt ?? 0).getTime(),
            );
    }

    /**
     * Returns the tracks associated with an artist.
     *
     * @param artistId ID of the artist whose tracks to retrieve.
     * @returns The matching tracks, or an empty array if the artist is not loaded.
     */
    getArtistTracks(artistId: string) {
        return Object.values(this.tracksById()).filter((track) => track.artistId === artistId);
    }

    getTrackRowById(trackId: string) {
        return this.trackRows().find((track) => track.id === trackId);
    }
}
