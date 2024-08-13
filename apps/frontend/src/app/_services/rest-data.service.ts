import { Injectable } from '@angular/core';
import { GenEntity, Genres, MovieRate, MovieInitData, RateResultDto, FindMatchResult } from '../typings/common';
import { Observable } from 'rxjs';
import { BasicRestDataService } from './basic-rest-data.service';

@Injectable({
  providedIn: 'root'
})
export class RestDataService extends BasicRestDataService {
  voteMovie(vote: MovieRate, movieId: number, pageNumber: number): Observable<RateResultDto> {
    return this.post<RateResultDto>(`movies/rate`, { movieId, rate: vote, pageNumber });
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

  fetchUsersEmails(startsWith: string = ''): Observable<Array<string>> {
    return this.get<Array<string>>(`user/emails?startsWith=${startsWith}`);
  }

  fetchUserMatch(genreId: number, userEmails: Array<string>): Observable<FindMatchResult> {
    return this.get<FindMatchResult>(`user/match?genreId=${genreId}&userEmails=${userEmails}`)
  }

  saveUserPreference(preference: Genres): Observable<boolean> {
    return this.post<boolean>('user/preference', { genreId: preference });
  }

  tryRegisterUser(userId: string, email: string): Observable<boolean> {
    return this.post<boolean>('user/register', { id: parseInt(userId), email });
  }
}
