import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MovieDetailComponent } from './movie-detail.component';

describe('MovieDetailComponent', () => {
  let component: MovieDetailComponent;
  let fixture: ComponentFixture<MovieDetailComponent>;
  const close = jest.fn();

  const movie = {
    id: 1,
    genreIds: [4],
    posterPath: '/poster.jpg',
    releaseDate: '2025-01-01',
    title: 'Movie 1',
    overview: 'About',
    voteAverage: 7,
  };

  beforeEach(async () => {
    close.mockClear();
    await TestBed.configureTestingModule({
      imports: [MovieDetailComponent],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            movie,
            movieDetailConfig: { shouldDisplayContent: true },
          },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MovieDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('builds the poster url from the TMDB path', () => {
    expect(component.getMoviePosterSrc('/poster.jpg')).toBe(
      'https://image.tmdb.org/t/p/original/poster.jpg'
    );
  });

  it('uses a placeholder when the movie has no poster', () => {
    expect(component.getMoviePosterSrc('')).toBe('./assets/no-image.svg');
  });

  it('closes the dialog', () => {
    component.closeDialog();

    expect(close).toHaveBeenCalled();
  });
});
