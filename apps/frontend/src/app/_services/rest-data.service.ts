import { Injectable } from '@angular/core';
import {
  GenEntity,
  Genres,
  MovieRate,
  MovieInitData,
  RateResultDto,
  FindMatchResult,
  MovieToRate,
  UserMatchFilterOptions,
  AuthSource,
} from '../typings/common';
import { Observable } from 'rxjs';
import { BasicRestDataService } from './basic-rest-data.service';
import { HttpParams } from '@angular/common/http';
import { Memoize } from '../_decorators/memoize.decorator';

@Injectable({
  providedIn: 'root',
})
export class RestDataService extends BasicRestDataService {
  voteMovie(
    vote: MovieRate,
    movieId: number,
    pageNumber: number | null
  ): Observable<RateResultDto> {
    return this.post<RateResultDto>(`movies/rate`, {
      movieId,
      rate: vote,
      pageNumber,
    });
  }

  fetchMoviesData(shouldLoadNextPage = false): Observable<MovieInitData> {
    return this.get<MovieInitData>(
      `movies?shouldLoadNextPage=${+shouldLoadNextPage}`
    );
  }

  fetchMovieData(movieId: number): Observable<MovieToRate> {
    return this.get<MovieToRate>(`movies/${movieId}`);
  }

  fetchUserGenrePreference(): Observable<GenEntity> {
    return this.get<GenEntity>('user/preference');
  }

  @Memoize()
  fetchAllGenres(): Observable<Array<GenEntity>> {
    return this.get<Array<GenEntity>>('user/preferences');
  }

  fetchUsersEmails(startsWith = ''): Observable<Array<string>> {
    return this.get<Array<string>>(`user/emails?startsWith=${startsWith}`);
  }

  fetchUserMatch(
    genreId: number,
    userEmails: Array<string>,
    userMatchFilterOptions: UserMatchFilterOptions = {
      pageNumber: 0,
    }
  ): Observable<FindMatchResult> {
    let httpParams = new HttpParams();
    httpParams = httpParams.append('genreId', genreId);
    httpParams = httpParams.appendAll({ mailOfUsers: ['', ...userEmails] });

    for (const key in userMatchFilterOptions) {
      if (
        (userMatchFilterOptions as unknown as Record<string, string | number>)[
          key
        ] !== undefined
      ) {
        httpParams = httpParams.append(
          key,
          userMatchFilterOptions[key as keyof UserMatchFilterOptions] as
            | true
            | string
        );
      }
    }

    return this.get<FindMatchResult>('user/match', {
      params: httpParams,
    });
  }

  saveUserPreference(preference: Genres): Observable<boolean> {
    return this.post<boolean>('user/preference', { genreId: preference });
  }

  saveIsMovieWatched(movieId: number, isMovieWatched: boolean) {
    return this.put<boolean>('movies/mark-watch', {
      movieId,
      isWatched: isMovieWatched,
    });
  }

  tryAuthenticateUser(authSource: AuthSource): void {
    window.location.replace(`${BACKEND_API_URL}/api/auth/${authSource}`);
  }
}
