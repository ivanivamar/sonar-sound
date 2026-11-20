export interface LibraryFile {
    version: number;
    updatedAt: string;
    artists: Record<string, ArtistFile>;
    albums: Record<string, AlbumFile>;
    tracks: Record<string, TrackFile>;
}

export interface ArtistFile {
    id: string;
    name: string;
    addedAt: string;
    dir: string;
    mbid: string;
    deezerId: number;
    image: Image;
    albums: number;
}

export interface Image {
    id: string;
    v: number;
    source: string;
}

export interface AlbumFile {
    id: string;
    title: string;
    artistId: string;
    artist: string;
    year?: number;
    date?: string;
    genre?: string;
    cover?: string | null;
    trackCount: number;
    addedAt: string;
}

export interface TrackFile {
    id: string;
    title: string;
    artist: string;
    albumId: string;
    artistId: string;
    disc: number;
    track: number | null;
    duration?: number;
    syncedLyrics: boolean;
    lyrics?: string;
    flac: Flac;
    mobile: Mobile;
    addedAt: string;
}

export interface TrackRow extends TrackFile {
    cover?: string | null;
    albumTitle?: string;
}

export interface DriveFile {
    id: string;
    size: number;
}

export interface Flac extends DriveFile {
    sampleRate?: number;
    bitDepth?: number;
}

export interface Mobile extends DriveFile {
    codec: string;
    bitrate: string;
}
