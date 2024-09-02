import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import { MatDividerModule} from '@angular/material/divider';
import { MatProgressBarModule} from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import type { GenEntity, Genres, MovieRate, MovieInitData, MovieToRate, RateResultDto } from '../typings/common';
import { ActivatedRoute } from '@angular/router';
import { map, take } from 'rxjs';
import { RestDataService } from '../_services/rest-data.service';
import { AlertInteractionService } from '../_services/alert-interaction.service';
import {MatBadgeModule} from '@angular/material/badge';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatChipsModule} from '@angular/material/chips';
import { MarkButtonData } from '../components/movie-detail/movie-detail.component';

@Component({
  selector: 'app-match',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule,
    MatProgressBarModule, MatButtonModule, MatBadgeModule, MatExpansionModule, MatChipsModule],
  templateUrl: './match.component.html',
  styleUrl: './match.component.scss',
})
export class MatchComponent implements OnInit {
  private static readonly MOVIES_REMAINS_FETCH_THRESHOLD = 4;
  private static readonly POSTER_URL_PREFIX = 'https://image.tmdb.org/t/p/original';
  private static readonly POSTER_URL_PLACEHOLDER = './assets/no-image.svg';

  markActions: Array<MarkButtonData> = [
    { label: 'Nah 🤨', value: 'NO' },
    { label: '?! 👀', value: 'IDK' },
    { label: 'Ok 🍕', value: 'YES' },
  ];
  fetchedMovies: Array<MovieToRate> = [];
  currentMovie!: MovieToRate;
  isLoadingMovies: boolean = false;
  genresOnPage!: Map<number, GenEntity>;
  pageNumber: number = 1;
  lastRateResult!: RateResultDto;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly restDataService: RestDataService,
    private readonly alertInteractionService: AlertInteractionService
  ) {}

  ngOnInit(): void {
  this.activatedRoute.data.pipe(take(1),
    map((data) => data['movieInitData']))
    .subscribe((movieInitData: MovieInitData) => {
      this.alertInteractionService.isLoadingSpinnerActive$.next(false);
      this.genresOnPage = new Map<number, GenEntity>(movieInitData.pageGenres.map(pageGenre => [pageGenre.id, pageGenre]));
      this.pageNumber = movieInitData.pageNumber;

      if (movieInitData?.movies?.length) {
        this.currentMovie = movieInitData?.movies?.shift()!;
        this.fetchedMovies = movieInitData?.movies;
      } else {
        console.log('Display load data again screen');
      }
    });
  }

  voteMovie(vote: MarkButtonData): void {
    this.restDataService.voteMovie(vote.value, this.currentMovie.id, this.resolvePageNumber())
      .pipe(take(1))
      .subscribe((rateResult: RateResultDto) => {
        if (this.fetchedMovies.length === 0) {
          this.isLoadingMovies = true;
          return;
        }

        if (!this.fetchedMovies?.length) {
          return;
        }

        this.lastRateResult = rateResult;
        this.currentMovie = this.fetchedMovies.shift()!;


        if (!rateResult.isRateSaved || rateResult.moviesCountLeftOnPage === null) {
          // this.alertInteractionService.error(rateResult?.reason ?? 'Error occured');
          return;
        }
    

        if (this.fetchedMovies?.length <= MatchComponent.MOVIES_REMAINS_FETCH_THRESHOLD) {
          this.restDataService.fetchMoviesData(true)
          .pipe(take(1))
          .subscribe((fetchedMovies: MovieInitData) => {
            this.fetchedMovies = this.fetchedMovies.concat(fetchedMovies?.movies);
            this.isLoadingMovies = true;
            this.pageNumber = fetchedMovies.pageNumber;
          })
        }
      });
  }

  getMoviePosterSrc(posterPath: string): string {
    return  posterPath ? MatchComponent.POSTER_URL_PREFIX + posterPath : MatchComponent.POSTER_URL_PLACEHOLDER; 
  }

  resolvePageNumber(): number {
    if (this.lastRateResult?.moviesCountLeftOnPage !== null && this.lastRateResult?.moviesCountLeftOnPage !== undefined) {
      return this.lastRateResult.moviesCountLeftOnPage <= MatchComponent.MOVIES_REMAINS_FETCH_THRESHOLD
        ? this.pageNumber - 1
        : this.pageNumber;
    }

    return this.pageNumber;
  }
}
