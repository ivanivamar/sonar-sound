import { AlbumFile, ArtistFile, TrackRow } from '../library/library-file.model';

/** Drive file ID of an artist's image, if it has one. */
export function artistCoverId(artist?: Pick<ArtistFile, 'image'> | null): string | null {
    return artist?.image?.id ?? null;
}

/** Drive file ID of a track's cover: its own, else its album's. */
export function trackCoverId(track: Pick<TrackRow, 'cover'>, album?: Pick<AlbumFile, 'cover'> | null): string | null {
    return track.cover ?? album?.cover ?? null;
}
