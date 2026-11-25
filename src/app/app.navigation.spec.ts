import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, RouterPreloader, provideRouter } from '@angular/router';
import { App } from './app';
import { appConfig } from './app.config';
import { AuthService } from './core/auth/auth.service';

@Component({ template: 'Page' })
class TestPage {}

describe('navigation', () => {
    it('preloads lazy pages after the first navigation', async () => {
        const loadComponent = vi.fn(async () => TestPage);
        TestBed.configureTestingModule({
            providers: [
                ...appConfig.providers,
                { provide: AuthService, useValue: { isSignedIn: signal(true) } },
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
                { provide: AuthService, useValue: { isSignedIn: signal(true) } },
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
