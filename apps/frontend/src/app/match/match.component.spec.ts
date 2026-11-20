import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MatchComponent } from './match.component';

describe('MatchComponent', () => {
  let component: MatchComponent;
  let fixture: ComponentFixture<MatchComponent>;

  const movie = (id: number) => ({
    id,
    genreIds: [4],
    posterPath: `/p${id}.jpg`,
    releaseDate: '2025-01-01',
    title: `Movie ${id}`,
    overview: 'About',
    voteAverage: 7,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              movieInitData: {
                pageGenres: [{ id: 4, name: 'Adventure' }],
                selectedGenreId: 4,
                pageNumber: 1,
                movies: [movie(1), movie(2), movie(3)],
              },
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MatchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the first movie of the page and queues the rest', () => {
    expect(component.currentMovie?.id).toBe(1);
    expect(component.fetchedMovies.map(m => m.id)).toEqual([2, 3]);
  });
});
