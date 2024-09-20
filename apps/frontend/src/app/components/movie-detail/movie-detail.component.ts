import { Component, inject, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { GenEntity, MovieRate, MovieToRate } from '../../typings/common';
import { Subject } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type MatDialogAction = 'Close';
export type CustomThemePalette = 'primary' | 'accent' | 'danger' | 'success' | 'info' | 'warn';

export type MovieDetailConfig = {
  shouldDisplayContent?: boolean;
  shouldDisplayActionButtons?: boolean;
  dialogActionButtons?: Array<MatDialogAction>;
};

export type MarkButtonData = {
  label: string;
  value: MovieRate;
  buttonColor: CustomThemePalette
};

type MovieDetailDialogData = {
  movie: MovieToRate;
  movieDetailConfig: MovieDetailConfig;
  genresOnPage?: Map<number, GenEntity>;
  markActions?: Array<MarkButtonData>;
}

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatExpansionModule, MatChipsModule, MatDialogActions,
      MatButtonModule, MatIconModule, NgOptimizedImage
  ],
  templateUrl: './movie-detail.component.html',
  styleUrl: './movie-detail.component.scss',
  encapsulation: ViewEncapsulation.Emulated
})
export class MovieDetailComponent implements OnInit {
  private static readonly POSTER_URL_PREFIX = 'https://image.tmdb.org/t/p/original';
  private static readonly POSTER_URL_PLACEHOLDER = './assets/no-image.svg';

  readonly #matDialogData = inject<MovieDetailDialogData>(MAT_DIALOG_DATA);
  readonly #matDialogRef = inject(MatDialogRef);

  get movie(): MovieToRate {
    return this.#matDialogData.movie;
  };

  get movieDetailConfig(): MovieDetailConfig {
    return this.#matDialogData.movieDetailConfig;
  }

  get genresOnPage(): Map<number, GenEntity> | undefined {
    return this.#matDialogData.genresOnPage;
  }

  get markActions(): Array<MarkButtonData> | undefined {
    return this.#matDialogData.markActions;
  }
 
  @Output()
  readonly markActionButtonClicked$: Subject<MarkButtonData> = new Subject<MarkButtonData>();

  getMoviePosterSrc(posterPath: string): string {
    return  posterPath ? MovieDetailComponent.POSTER_URL_PREFIX + posterPath : MovieDetailComponent.POSTER_URL_PLACEHOLDER; 
  }

  ngOnInit(): void {
  }

  closeDialog(): void {
    this.#matDialogRef.close();
  }
}
