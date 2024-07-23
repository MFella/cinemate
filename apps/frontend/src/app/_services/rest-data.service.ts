import { Injectable } from '@angular/core';
import { GenEntity, Genres, MarkAction, MovieInitData, RateResultDto } from '../typings/common';
import { Observable } from 'rxjs';
import { BasicRestDataService } from './basic-rest-data.service';

@Injectable({
  providedIn: 'root'
})
export class RestDataService extends BasicRestDataService {
  voteMovie(vote: MarkAction, imdbId: string): Observable<RateResultDto> {
    return this.post<RateResultDto>(`movies/rate`, { imdbId, rate: vote });
  }

  fetchMoviesData(shouldLoadNextPage: boolean = false): Observable<MovieInitData> {
    return this.get<MovieInitData>(`movies?shouldLoadNextPage=${+shouldLoadNextPage}`)
  }

  fetchUserGenrePreference(): Observable<GenEntity> {
    return this.get<GenEntity>('user/preference');
  }

  fetchAllGenres(): Observable<Array<GenEntity>> {
    return this.get<Array<GenEntity>>('user/preferences');
  }

  saveUserPreference(preference: Genres): Observable<boolean> {
    return this.post<boolean>('user/preference', { genreId: preference });
  }
}
