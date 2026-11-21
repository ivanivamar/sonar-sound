import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { DriveService } from '../drive/drive.service';
import { CoverService } from './cover.service';

describe('CoverService', () => {
    const downloadBlob = vi.fn();
    const signOutCount = signal(0);
    const stored = new Map<string, Response>();

    const configure = () => TestBed.configureTestingModule({
        providers: [
            { provide: DriveService, useValue: { downloadBlob } },
            { provide: AuthService, useValue: { isSignedIn: signal(true), signOutCount } },
        ],
    });

    beforeEach(() => {
        downloadBlob.mockReset();
        downloadBlob.mockImplementation(() => of(new Blob(['x'])));
        signOutCount.set(0);
        stored.clear();

        vi.stubGlobal('URL', Object.assign(URL, {
            createObjectURL: vi.fn(() => 'blob:cover'),
            revokeObjectURL: vi.fn(),
        }));
        vi.stubGlobal('caches', {
            open: async () => ({
                match: async (key: string) => stored.get(key)?.clone(),
                put: async (key: string, response: Response) => void stored.set(key, response),
            }),
            delete: vi.fn(async () => void stored.clear()),
        });
        configure();
    });

    afterEach(() => vi.unstubAllGlobals());

    it('downloads a cover once for its URL and its blob', async () => {
        const service = TestBed.inject(CoverService);
        let url = '';
        let blob: Blob | undefined;
        service.getUrl('cover-1').subscribe(value => (url = value));
        service.getBlob('cover-1').subscribe(value => (blob = value));
        service.getUrl('cover-1').subscribe();
        await vi.waitFor(() => expect(blob).toBeDefined());

        expect(downloadBlob).toHaveBeenCalledTimes(1);
        expect(url).toBe('blob:cover');
    });

    it('retries rate-limited downloads and gives up on other errors immediately', async () => {
        const service = TestBed.inject(CoverService);
        downloadBlob
            .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 429 })))
            .mockReturnValueOnce(of(new Blob(['x'])));

        await expect(firstValueFrom(service.getBlob('retry'))).resolves.toBeInstanceOf(Blob);
        expect(downloadBlob).toHaveBeenCalledTimes(2);

        downloadBlob.mockClear();
        downloadBlob.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
        await expect(firstValueFrom(service.getBlob('missing'))).rejects.toBeInstanceOf(HttpErrorResponse);
        expect(downloadBlob).toHaveBeenCalledTimes(1);
    });

    it('serves covers persisted by an earlier session without downloading them', async () => {
        await firstValueFrom(TestBed.inject(CoverService).getBlob('cover-1'));
        await vi.waitFor(() => expect(stored.size).toBe(1));
        expect(downloadBlob).toHaveBeenCalledTimes(1);

        TestBed.resetTestingModule();
        configure();
        const blob = await firstValueFrom(TestBed.inject(CoverService).getBlob('cover-1'));

        expect(blob).toBeDefined();
        expect(downloadBlob).toHaveBeenCalledTimes(1);
    });

    it('removes the persisted covers on sign-out', async () => {
        await firstValueFrom(TestBed.inject(CoverService).getBlob('cover-1'));
        await vi.waitFor(() => expect(stored.size).toBe(1));

        signOutCount.set(1);
        TestBed.tick();

        await vi.waitFor(() => expect(stored.size).toBe(0));
    });
});
