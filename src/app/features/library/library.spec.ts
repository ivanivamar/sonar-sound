import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DriveService } from '../../core/drive/drive.service';
import { LibraryService } from '../../core/library/library.service';
import { Library } from './library';

describe('Library', () => {
    let component: Library;
    let fixture: ComponentFixture<Library>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Library],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { isSignedIn: signal(true) } },
                { provide: DriveService, useValue: {} },
                {
                    provide: LibraryService,
                    useValue: {
                        isLoading: signal(false),
                        allCount: signal(0),
                        albums: signal([]),
                        artists: signal([]),
                        tracks: signal([]),
                        trackRows: signal([]),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(Library);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
