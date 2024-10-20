import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import type {
  GenEntity,
  MovieInitData,
  MovieToRate,
  RateResultDto,
  MatchedMovie,
} from '../typings/common';
import { ActivatedRoute } from '@angular/router';
import { map, take } from 'rxjs';
import { RestDataService } from '../_services/rest-data.service';
import { AlertInteractionService } from '../_services/alert-interaction.service';
import { MatBadgeModule } from '@angular/material/badge';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MarkButtonData } from '../components/movie-detail/movie-detail.component';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  MatSlideToggle,
  MatSlideToggleModule,
} from '@angular/material/slide-toggle';

@Component({
  selector: 'app-match',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatProgressBarModule,
    MatButtonModule,
    MatBadgeModule,
    MatExpansionModule,
    MatChipsModule,
    NgOptimizedImage,
    MatIconModule,
    MatSlideToggleModule,
  ],
  providers: [],
  templateUrl: './match.component.html',
  styleUrl: './match.component.scss',
})
export class MatchComponent implements OnInit {
  private static readonly MOVIES_REMAINS_FETCH_THRESHOLD = 4;
  private static readonly POSTER_URL_PREFIX =
    'https://image.tmdb.org/t/p/original';
  private static readonly POSTER_URL_PLACEHOLDER = './assets/no-image.svg';

  readonly matDialogData = inject(MAT_DIALOG_DATA, { optional: true });
  readonly matDialogRef = inject(MatDialogRef, { optional: true });
  readonly #restDataService = inject(RestDataService);
  readonly #alertInteractionService = inject(AlertInteractionService);
  isRequestPended = false;

  markActions: Array<MarkButtonData> = [
    { label: 'No 🤨', value: 'NO', buttonColor: 'primary' },
    { label: '?! 👀', value: 'IDK', buttonColor: 'warn' },
    { label: 'Ok 🍕', value: 'YES', buttonColor: 'accent' },
  ];
  fetchedMovies: Array<MovieToRate> = [];
  currentMovie!: MovieToRate;
  isLoadingMovies = false;
  genresOnPage!: Map<number, GenEntity>;
  pageNumber: number | null = 1;
  lastRateResult!: RateResultDto;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly restDataService: RestDataService,
    private readonly alertInteractionService: AlertInteractionService
  ) {}

  ngOnInit(): void {
    if (!this.matDialogData) {
      this.observeMovieInitData();
    } else {
      this.assignMatDialogData();
    }
  }

  voteMovie(vote: MarkButtonData): void {
    this.isRequestPended = true;
    this.restDataService
      .voteMovie(vote.value, this.currentMovie.id, this.resolvePageNumber())
      .pipe(take(1))
      .subscribe(
        (rateResult: RateResultDto) => {
          this.isRequestPended = false;
          if (this.fetchedMovies.length === 0) {
            this.isLoadingMovies = true;
            return;
          }

          if (!this.fetchedMovies?.length) {
            return;
          }

          this.lastRateResult = rateResult;
          const fetchMovieRemovalResult = this.fetchedMovies.shift();
          if (fetchMovieRemovalResult) {
            this.currentMovie = fetchMovieRemovalResult;
          }

          if (
            !rateResult.isRateSaved ||
            rateResult.moviesCountLeftOnPage === null
          ) {
            return;
          }

          if (
            this.fetchedMovies?.length <=
            MatchComponent.MOVIES_REMAINS_FETCH_THRESHOLD
          ) {
            this.restDataService
              .fetchMoviesData(true)
              .pipe(take(1))
              .subscribe((fetchedMovies: MovieInitData) => {
                this.fetchedMovies = this.fetchedMovies.concat(
                  fetchedMovies?.movies
                );
                this.isLoadingMovies = true;
                this.pageNumber = fetchedMovies.pageNumber;
              });
          }
        },
        () => {
          this.alertInteractionService.error(
            'Error occured during voting movie'
          );
        }
      );
  }

  getMoviePosterStyles(posterPath: string): Record<string, string> {
    const posterUrl = posterPath
      ? MatchComponent.POSTER_URL_PREFIX + posterPath
      : MatchComponent.POSTER_URL_PLACEHOLDER;

    return {
      background: `no-repeat center/100% url(${posterUrl})`,
    };
  }

  getMovieUrl(posterPath: string): string {
    return posterPath
      ? MatchComponent.POSTER_URL_PREFIX + posterPath
      : MatchComponent.POSTER_URL_PLACEHOLDER;
  }

  closeDialog(): void {
    this.matDialogRef?.close();
  }

  updateIsMovieWatched(
    matchedRate: MovieToRate,
    matchedMovie: MatchedMovie,
    $event: MouseEvent,
    slideToggleRef: MatSlideToggle
  ): void {
    $event.stopPropagation();
    this.#restDataService
      .saveIsMovieWatched(matchedRate.id, !matchedMovie.isWatched)
      .pipe(take(1))
      .subscribe((isResultSaved: boolean) => {
        if (!isResultSaved) {
          slideToggleRef.writeValue(matchedMovie.isWatched);
          this.#alertInteractionService.error(
            'Movie "is-watched" cannot be saved'
          );
        } else {
          matchedMovie.isWatched = !matchedMovie.isWatched;
          slideToggleRef.setDisabledState(false);
        }
      });
  }

  private resolvePageNumber(): number | null {
    if (this.pageNumber === null) {
      return this.pageNumber;
    }

    if (
      this.lastRateResult?.moviesCountLeftOnPage !== null &&
      this.lastRateResult?.moviesCountLeftOnPage !== undefined
    ) {
      return this.lastRateResult.moviesCountLeftOnPage <=
        MatchComponent.MOVIES_REMAINS_FETCH_THRESHOLD
        ? this.pageNumber - 1
        : this.pageNumber;
    }

    return this.pageNumber;
  }

  private observeMovieInitData(): void {
    this.activatedRoute.data
      .pipe(
        take(1),
        map(data => data['movieInitData'])
      )
      .subscribe((movieInitData: MovieInitData) => {
        this.alertInteractionService.isLoadingSpinnerActive$.next(false);
        this.genresOnPage = new Map<number, GenEntity>(
          movieInitData.pageGenres.map(pageGenre => [pageGenre.id, pageGenre])
        );
        this.pageNumber = movieInitData.pageNumber;

        if (movieInitData?.movies?.length) {
          const movieRemovalResult = movieInitData.movies.shift();
          if (movieRemovalResult) {
            this.currentMovie = movieRemovalResult;
          }
          this.fetchedMovies = movieInitData?.movies;
        } else {
          console.log('Display load data again screen');
        }
      });
  }

  private assignMatDialogData(): void {
    this.currentMovie = this.matDialogData.movie;
  }
}
