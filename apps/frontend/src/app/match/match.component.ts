import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import { MatDividerModule} from '@angular/material/divider';
import { MatProgressBarModule} from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import type { Genres, MarkAction, MovieInitData, MovieToRate, RateResultDto } from '../typings/common';
import { ActivatedRoute } from '@angular/router';
import { map, take } from 'rxjs';
import { RestDataService } from '../_services/rest-data.service';
import { AlertInteractionService } from '../_services/alert-interaction.service';
import {MatBadgeModule} from '@angular/material/badge';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatChipsModule} from '@angular/material/chips';


type MarkButtonData = {
  label: string;
  value: MarkAction
};

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
  markActions: Array<MarkButtonData> = [
    { label: 'Nah 🤨', value: 'NO' },
    { label: '?! 👀', value: 'IDK' },
    { label: 'Ok 🍕', value: 'YES' },
  ];
  fetchedMovies: Array<MovieToRate> = [];
  currentMovie!: MovieToRate;
  originGenre!: Genres;
  isLoadingMovies: boolean = false;

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

      if (movieInitData?.movies?.length) {
        this.currentMovie = movieInitData?.movies?.shift()!;
        this.fetchedMovies = movieInitData?.movies;
        this.originGenre = movieInitData.genre;
        console.log(movieInitData?.movies);
      } else {
        console.log('Display load data again screen');
      }
    });
  }

  voteMovie(vote: MarkButtonData): void {
    this.restDataService.voteMovie(vote.value, this.currentMovie.imdb_id)
      .pipe(take(1))
      .subscribe((rateResult: RateResultDto) => {
        if (this.fetchedMovies.length === 0) {
          this.isLoadingMovies = true;
          return;
        }

        if (!this.fetchedMovies?.length) {
          return;
        }

        this.currentMovie = this.fetchedMovies.shift()!;


        if (!rateResult.isRateSaved || rateResult.moviesCountLeftOnPage === null) {
          // this.alertInteractionService.error(rateResult?.reason ?? 'Error occured');
          return;
        }
    

        console.log(rateResult, this.fetchedMovies.length);
        if (this.fetchedMovies?.length <= MatchComponent.MOVIES_REMAINS_FETCH_THRESHOLD) {
          this.restDataService.fetchMoviesData(true)
          .pipe(take(1))
          .subscribe((fetchedMovies: MovieInitData) => {
            this.fetchedMovies = this.fetchedMovies.concat(fetchedMovies?.movies);
            this.isLoadingMovies = true;
          })
        }
      });
  }
}
