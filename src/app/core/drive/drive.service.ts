import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DriveFile, DriveFileList } from './drive.model';
import { map, Observable, switchMap, throwError } from 'rxjs';

@Service()
export class DriveService {
    private readonly baseUrl = 'https://www.googleapis.com/drive/v3';
    private readonly http = inject(HttpClient);

    getFiles(): Observable<DriveFileList> {
        return this.http.get<DriveFileList>(`${this.baseUrl}/files`, {
            params: {
                pageSize: '5',
                fields: 'files(id,name,mimeType)',
            }
        });
    }

    findFile(name: string): Observable<DriveFile | undefined> {
        return this.http.get<DriveFileList>(`${this.baseUrl}/files`, {
            params: {
                q: `name='${name}' and trashed = false`,
                pageSize: '1',
                fields: 'files(id,name,mimeType)',
            }
        }).pipe(map(response => response.files[0]));
    }

    downloadJson<T>(fileId: string): Observable<T> {
        return this.http.get<T>(`${this.baseUrl}/files/${fileId}`, {
            params: {
                alt: 'media'
            }
        });
    }

    readJsonByName<T>(name: string): Observable<T> {
        return this.findFile(name).pipe(
            map(file => file?.id),
            switchMap(fileId => fileId ? this.downloadJson<T>(fileId) : throwError(() => new Error(`File with name "${name}" not found`)))
        );
    }
}
