import { Component, Directive, input, output, Pipe, PipeTransform, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterLink, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CoverColor } from '../../../core/cover/cover-color';
import { PlayerService } from '../../../core/player/player.service';
import { ViewportService } from '../../../core/viewport/viewport.service';
import { NowPlaying } from './now-playing';

@Component({ selector: 'app-atmosphere', template: '', standalone: true })
class AtmosphereStub {}

@Component({ selector: 'app-cover', template: '', standalone: true })
class CoverStub {
    cover = input<unknown>();
    extractColor = input(false);
    colorResolved = output<CoverColor | null>();
}

@Component({ selector: 'app-slider', template: '', standalone: true })
class SliderStub {
    value = input(0);
    max = input(0);
    valueChange = output<number>();
}

@Component({ selector: 'app-playback-controls', template: '', standalone: true })
class PlaybackControlsStub {}

@Component({ selector: 'app-queue-content', template: '', standalone: true })
class QueueContentStub {
    linkActivated = output<void>();
}

@Component({ selector: 'app-bottom-sheet', template: '', standalone: true })
class BottomSheetStub {
    label = input('');
}

@Directive({ selector: '[appRipple]', standalone: true })
class RippleStub {}

@Pipe({ name: 'duration', standalone: true })
class DurationStub implements PipeTransform {
    transform(value: unknown): string {
        return String(value);
    }
}

describe('NowPlaying template', () => {
    let fixture: ComponentFixture<NowPlaying>;

    const playerService = {
        currentTrack: signal<{
            title: string;
            artist: string;
            albumId?: string;
            albumTitle?: string;
        } | null>(null),
        duration: signal(200),
        position: signal(50),
        cover: signal<unknown>(null),
        coverColor: signal<{ hue: number; chroma: number } | null>(null),
        seek: vi.fn(),
    };

    const viewportService = {
        isPhone: signal(false),
    };

    beforeEach(async () => {
        playerService.currentTrack.set(null);
        playerService.duration.set(200);
        playerService.position.set(50);
        playerService.cover.set(null);
        playerService.coverColor.set(null);
        playerService.seek.mockClear();
        viewportService.isPhone.set(false);

        await TestBed.configureTestingModule({
            imports: [NowPlaying],
            providers: [
                { provide: PlayerService, useValue: playerService },
                { provide: ViewportService, useValue: viewportService },
                provideRouter([]),
            ],
        })
            .overrideComponent(NowPlaying, {
                set: {
                    imports: [
                        AtmosphereStub,
                        CoverStub,
                        SliderStub,
                        PlaybackControlsStub,
                        QueueContentStub,
                        BottomSheetStub,
                        RippleStub,
                        RouterLink,
                        DurationStub,
                    ],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(NowPlaying);
        fixture.detectChanges();
    });

    it('renders an accessible, initially inert dialog', () => {
        const dialog: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');

        expect(dialog.getAttribute('aria-label')).toBe('Now playing');
        expect(dialog.hasAttribute('inert')).toBe(true);
        expect(dialog.classList.contains('open')).toBe(false);
    });

    it('opens the dialog when a track is playing', () => {
        playerService.currentTrack.set({ title: 'Track', artist: 'Artist' });
        fixture.componentInstance.open();
        fixture.detectChanges();

        const dialog: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');

        expect(dialog.classList.contains('open')).toBe(true);
        expect(dialog.hasAttribute('inert')).toBe(false);
    });

    it('switches desktop tabs and updates their pressed state', () => {
        const lyricsButton = [...fixture.nativeElement.querySelectorAll('button')].find(
            (button: HTMLButtonElement) => button.textContent.includes('Lyrics'),
        ) as HTMLButtonElement;

        lyricsButton.click();
        fixture.detectChanges();

        expect(lyricsButton.getAttribute('aria-pressed')).toBe('true');
        expect(fixture.nativeElement.textContent).toContain('Lyrics content goes here');
    });

    it('shows phone track details and seeks through the slider', () => {
        viewportService.isPhone.set(true);
        playerService.currentTrack.set({
            title: 'Test Track',
            artist: 'Test Artist',
            albumId: 'album-1',
            albumTitle: 'Test Album',
        });
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.track-title').textContent).toContain(
            'Test Track',
        );
        expect(fixture.nativeElement.querySelector('.track-artist').textContent).toContain(
            'Test Artist',
        );
        expect(fixture.nativeElement.querySelector('a').textContent).toContain('Test Album');

        fixture.debugElement.query(By.directive(SliderStub)).componentInstance.valueChange.emit(42);

        expect(playerService.seek).toHaveBeenCalledWith(42);
    });

    it('renders the playback controls with an accessible group label on phone', () => {
        viewportService.isPhone.set(true);
        fixture.detectChanges();

        const controls = fixture.nativeElement.querySelector('app-playback-controls');

        expect(controls.getAttribute('role')).toBe('group');
        expect(controls.getAttribute('aria-label')).toBe('Playback controls');
    });
});
