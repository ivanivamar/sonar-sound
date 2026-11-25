import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, RouterPreloader, provideRouter } from '@angular/router';
import { App } from './app';
import { appConfig } from './app.config';
import { AuthService } from './core/auth/auth.service';
import { CoverColorService } from './core/cover/cover-color.service';
import { CoverService } from './core/cover/cover.service';
import { LibraryService } from './core/library/library.service';
import { TrackRow } from './core/library/library-file.model';
import { PlayerService, RepeatMode } from './core/player/player.service';
import { QueuePersistence } from './core/player/queue/queue-persistence.service';
import { createQueue } from './core/player/queue/queue.model';
import { QueueService } from './core/player/queue/queue.service';
import { UserService } from './core/user/user.service';
import { ViewportService } from './core/viewport/viewport.service';

@Component({ template: 'Page' })
class TestPage {}

describe('navigation', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('closes now playing when a sidebar link is clicked, even on the current page', async () => {
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })));
        TestBed.configureTestingModule({
            imports: [App],
            providers: [
                provideRouter([
                    { path: 'home', component: TestPage },
                    { path: 'library', component: TestPage },
                ]),
                {
                    provide: AuthService,
                    useValue: { isSignedIn: signal(true), signOutCount: signal(0) },
                },
                { provide: QueuePersistence, useValue: {} },
                { provide: UserService, useValue: { userInfo: { value: () => undefined } } },
                { provide: ViewportService, useValue: { isPhone: signal(false) } },
                { provide: QueueService, useValue: { state: signal(createQueue([], -1)) } },
                { provide: LibraryService, useValue: { getTrackRowById: () => undefined } },
                { provide: CoverService, useValue: { getUrl: vi.fn() } },
                { provide: CoverColorService, useValue: { getColor: vi.fn() } },
                {
                    provide: PlayerService,
                    useValue: {
                        currentTrack: signal({ id: 'a', title: 'A', artist: 'B', albumId: 'c' } as TrackRow),
                        error: signal(null),
                        isPlaying: signal(false),
                        isBuffering: signal(false),
                        repeat: signal(RepeatMode.Off),
                        position: signal(0),
                        duration: signal(0),
                        coverColor: signal(null),
                        cover: signal(null),
                        toggle: vi.fn(),
                        seek: vi.fn(),
                    },
                },
            ],
        });
        const router = TestBed.inject(Router);
        await router.navigateByUrl('/home');
        const fixture = TestBed.createComponent(App);
        await fixture.whenStable();
        const element = fixture.nativeElement as HTMLElement;
        const dialog = element.querySelector<HTMLElement>('.now-playing-wrapper')!;
        const home = element.querySelector<HTMLAnchorElement>('app-sidebar a[href="/home"]')!;

        element.querySelector<HTMLElement>('app-player footer')!.click();
        await fixture.whenStable();
        expect(dialog.classList.contains('open')).toBe(true);

        element.querySelector<HTMLButtonElement>('app-sidebar .account-button')!.click();
        expect(dialog.classList.contains('open')).toBe(true);
        home.focus();
        home.click();
        await fixture.whenStable();

        expect(dialog.classList.contains('open')).toBe(false);
        expect(dialog.hasAttribute('inert')).toBe(true);
        expect(document.activeElement).toBe(home);
        expect(router.url).toBe('/home');

        element.querySelector<HTMLElement>('app-player footer')!.click();
        await fixture.whenStable();
        element.querySelector<HTMLAnchorElement>('app-sidebar a[href="/library"]')!.click();
        await fixture.whenStable();
        expect(dialog.classList.contains('open')).toBe(false);
        expect(router.url).toBe('/library');
    });

    it('preloads lazy pages after the first navigation', async () => {
        const loadComponent = vi.fn(async () => TestPage);
        TestBed.configureTestingModule({
            providers: [
                ...appConfig.providers,
                {
                    provide: AuthService,
                    useValue: { isSignedIn: signal(true), signOutCount: signal(0) },
                },
                { provide: QueuePersistence, useValue: {} },
            ],
        });
        const router = TestBed.inject(Router);
        router.resetConfig([
            { path: 'start', component: TestPage },
            { path: 'lazy', loadComponent },
        ]);
        TestBed.inject(RouterPreloader).setUpPreloading();

        await router.navigateByUrl('/start');

        await vi.waitFor(() => expect(loadComponent).toHaveBeenCalledOnce());
    });

    it('shows pending navigation until it finishes or is cancelled', async () => {
        let finishLoading!: (page: typeof TestPage) => void;
        const loadComponent = vi.fn(
            () => new Promise<typeof TestPage>((resolve) => (finishLoading = resolve)),
        );
        TestBed.configureTestingModule({
            imports: [App],
            providers: [
                provideRouter([
                    { path: 'start', component: TestPage },
                    { path: 'other', component: TestPage },
                    { path: 'slow', loadComponent },
                ]),
                {
                    provide: AuthService,
                    useValue: { isSignedIn: signal(true), signOutCount: signal(0) },
                },
                { provide: QueuePersistence, useValue: {} },
            ],
        }).overrideComponent(App, {
            set: { imports: [RouterOutlet], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
        });
        const router = TestBed.inject(Router);
        const fixture = TestBed.createComponent(App);
        fixture.detectChanges();
        await router.navigateByUrl('/start');
        fixture.detectChanges();
        const status = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
        expect(status.textContent?.trim()).toBe('');

        const pending = router.navigateByUrl('/slow');
        await vi.waitFor(() => expect(loadComponent).toHaveBeenCalledOnce());
        fixture.detectChanges();
        expect(status.textContent).toContain('Loading page...');

        await router.navigateByUrl('/other');
        fixture.detectChanges();
        expect(status.textContent?.trim()).toBe('');
        finishLoading(TestPage);
        expect(await pending).toBe(false);

        let finishSecondLoad!: (page: typeof TestPage) => void;
        router.resetConfig([
            { path: 'other', component: TestPage },
            {
                path: 'slow-again',
                loadComponent: () =>
                    new Promise<typeof TestPage>((resolve) => (finishSecondLoad = resolve)),
            },
        ]);
        const completing = router.navigateByUrl('/slow-again');
        await vi.waitFor(() => expect(finishSecondLoad).toBeDefined());
        fixture.detectChanges();
        expect(status.textContent).toContain('Loading page...');
        finishSecondLoad(TestPage);
        expect(await completing).toBe(true);
        fixture.detectChanges();
        expect(status.textContent?.trim()).toBe('');
    });
});
