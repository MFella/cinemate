import { Component, Input } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-movie-preview',
  standalone: true,
  imports: [CommonModule, MatCardModule, NgOptimizedImage],
  templateUrl: './movie-preview.component.html',
  styleUrl: './movie-preview.component.scss',
})
export class MoviePreviewComponent {
  private static readonly POSTER_URL_PREFIX =
    'https://image.tmdb.org/t/p/original';
  private static readonly POSTER_URL_PLACEHOLDER = './assets/no-image.svg';

  @Input({ required: true })
  posterPath!: string;

  getMoviePosterStyles(): Record<string, string> {
    return {
      background: `no-repeat center/100% url(${this.getMoviePosterUrl()})`,
    };
  }

  getMoviePosterUrl(): string {
    return this.posterPath
      ? MoviePreviewComponent.POSTER_URL_PREFIX + this.posterPath
      : MoviePreviewComponent.POSTER_URL_PLACEHOLDER;
  }

  getMoviePosterPlaceholderUrl(): string {
    return MoviePreviewComponent.POSTER_URL_PLACEHOLDER;
  }
}
