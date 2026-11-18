export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
}

export interface DriveFileList {
    files: DriveFile[];
}