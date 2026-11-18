import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DriveFile, DriveFileList } from './drive.model';
import { map, Observable, switchMap, throwError } from 'rxjs';

/**
 * Provides methods for listing, finding, and downloading files through the
 * Google Drive v3 API.
 */
@Service()
export class DriveService {
    private readonly baseUrl = 'https://www.googleapis.com/drive/v3';
    private readonly http = inject(HttpClient);

    /**
     * Retrieves up to five Drive files with their IDs, names, and MIME types.
     *
     * @returns An observable of the Drive file-list response.
     */
    getFiles(): Observable<DriveFileList> {
        return this.http.get<DriveFileList>(`${this.baseUrl}/files`, {
            params: {
                pageSize: '5',
                fields: 'files(id,name,mimeType)',
            }
        });
    }

    /**
     * Finds the first non-trashed Drive file with the given name.
     *
     * @param name Name to search for.
     * @returns An observable containing the matching file, or `undefined` if none is found.
     */
    findFile(name: string): Observable<DriveFile | undefined> {
        return this.http.get<DriveFileList>(`${this.baseUrl}/files`, {
            params: {
                q: `name='${name}' and trashed = false`,
                pageSize: '1',
                fields: 'files(id,name,mimeType)',
            }
        }).pipe(map(response => response.files[0]));
    }

    /**
     * Downloads a Drive file's contents and treats the response body as `T`.
     *
     * @param fileId ID of the file to download.
     * @returns An observable of the downloaded response body.
     */
    downloadJson<T>(fileId: string): Observable<T> {
        return this.http.get<T>(`${this.baseUrl}/files/${fileId}`, {
            params: {
                alt: 'media'
            }
        });
    }

    /**
     * Finds a file by name and downloads its contents as `T`.
     *
     * @param name Name of the file to find and download.
     * @returns An observable of the downloaded response body; errors if no file with that name is found.
     */
    readJsonByName<T>(name: string): Observable<T> {
        return this.findFile(name).pipe(
            map(file => file?.id),
            switchMap(fileId => fileId ? this.downloadJson<T>(fileId) : throwError(() => new Error(`File with name "${name}" not found`)))
        );
    }

    downloadBlob(fileId: string): Observable<Blob> {
        return this.http.get(`${this.baseUrl}/files/${fileId}`, {
            params: {
                alt: 'media'
            },
            responseType: 'blob'
        });
    }
}
