import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, vi } from 'vitest';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';
import { QueuePersistence } from './core/player/queue/queue-persistence.service';

describe('App', () => {
    afterEach(() => vi.unstubAllGlobals());

    beforeEach(async () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => ({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        );
        await TestBed.configureTestingModule({
            imports: [App],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { isSignedIn: signal(false) } },
                { provide: QueuePersistence, useValue: {} },
            ],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(App);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it('should render the app shell', async () => {
        const fixture = TestBed.createComponent(App);
        fixture.detectChanges();
        await fixture.whenStable();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('main.app-shell')).not.toBeNull();
    });
});
