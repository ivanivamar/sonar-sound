import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';
import { CoverService } from './core/cover/cover.service';
import { TrackRow } from './core/library/library-file.model';
import { PlayerService } from './core/player/player.service';
import { Atmosphere } from './layout/atmosphere/atmosphere';
import { AtmosphereService, AtmosphereState } from './layout/atmosphere/atmosphere.service';
import { TrackCard } from './shared/media/track-card/track-card';

const track: TrackRow = {
    id: 'track', title: 'Track', artist: 'Artist', albumId: 'album', artistId: 'artist',
    disc: 1, track: 1, syncedLyrics: false, flac: { id: 'flac', size: 1 },
    mobile: { id: 'mobile', size: 1, codec: 'aac', bitrate: '128' }, addedAt: '',
};

@Component({
    selector: 'test-track',
    imports: [TrackCard],
    template: '<app-track-card [track]="track" />',
})
class TestTrack {
    readonly track = track;
}

describe('App atmosphere colors', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('shares the resolved atmosphere colors with the active track and updates page overrides', async () => {
        vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn() })));
        await TestBed.configureTestingModule({
            imports: [App],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { isSignedIn: signal(true) } },
                { provide: CoverService, useValue: {} },
                {
                    provide: PlayerService,
                    useValue: {
                        currentTrack: signal(track),
                        isPlaying: signal(true),
                        isBuffering: signal(false),
                    },
                },
            ],
        }).overrideComponent(App, {
            set: {
                imports: [Atmosphere, TestTrack],
                template: '<app-atmosphere /><test-track />',
            },
        }).compileComponents();

        const service = TestBed.inject(AtmosphereService);
        const playing = signal<Partial<AtmosphereState>>({ hue: '120', chroma: '0.8' });
        service.register(playing);
        const fixture = TestBed.createComponent(App);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        const atmosphere = root.querySelector('app-atmosphere') as HTMLElement;
        const card = root.querySelector('.track-card.current-playing');
        expect(card).not.toBeNull();
        expect(root.style.getPropertyValue('--atmosphere-accent-hue')).toBe('120');
        expect(root.style.getPropertyValue('--atmosphere-accent-chroma')).toBe('0.8');
        expect(atmosphere.style.getPropertyValue('--atmosphere-accent-hue')).toBe('120');
        expect(atmosphere.style.getPropertyValue('--atmosphere-accent-chroma')).toBe('0.8');

        const page = signal<Partial<AtmosphereState>>({ hue: '240', chroma: '0.4' });
        const unregister = service.register(page);
        fixture.detectChanges();
        expect(root.style.getPropertyValue('--atmosphere-accent-hue')).toBe('240');
        expect(root.style.getPropertyValue('--atmosphere-accent-chroma')).toBe('0.4');
        expect(atmosphere.style.getPropertyValue('--atmosphere-accent-hue')).toBe('240');
        expect(atmosphere.style.getPropertyValue('--atmosphere-accent-chroma')).toBe('0.4');

        unregister();
        playing.set({ hue: '35', chroma: '0' });
        fixture.detectChanges();
        expect(root.style.getPropertyValue('--atmosphere-accent-hue')).toBe('35');
        expect(root.style.getPropertyValue('--atmosphere-accent-chroma')).toBe('0');
        expect(atmosphere.style.getPropertyValue('--atmosphere-accent-hue')).toBe('35');
        expect(atmosphere.style.getPropertyValue('--atmosphere-accent-chroma')).toBe('0');
    });
});
