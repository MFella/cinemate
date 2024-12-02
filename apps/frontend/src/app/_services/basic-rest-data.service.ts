import {
  HttpClient,
  HttpContext,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export abstract class BasicRestDataService {
  private static readonly API_URL_SUFFIX = 'api';

  constructor(protected readonly httpClient: HttpClient) {}

  protected get<T>(
    urlSuffix: string,
    options: HttpGetOptions = {}
  ): Observable<T> {
    return this.httpClient.get<T>(this.getFullEndpointUrl(urlSuffix), {
      withCredentials: true,
      ...options,
    });
  }

  protected post<T>(urlSuffix: string, body: unknown | null): Observable<T> {
    return this.httpClient.post<T>(this.getFullEndpointUrl(urlSuffix), body, {
      withCredentials: true,
    });
  }

  protected put<T>(urlSuffix: string, body: unknown | null): Observable<T> {
    return this.httpClient.put<T>(this.getFullEndpointUrl(urlSuffix), body, {
      withCredentials: true,
    });
  }

  protected delete<T>(urlSuffix: string): Observable<T> {
    return this.httpClient.delete<T>(this.getFullEndpointUrl(urlSuffix));
  }

  private getFullEndpointUrl(urlSuffix: string): string {
    return `${BACKEND_API_URL}/${BasicRestDataService.API_URL_SUFFIX}/${urlSuffix}`;
  }
}

type HttpGetOptions = {
  headers?:
    | HttpHeaders
    | {
        [header: string]: string | string[];
      };
  context?: HttpContext;
  observe?: 'body';
  params?:
    | HttpParams
    | {
        [param: string]:
          | string
          | number
          | boolean
          | ReadonlyArray<string | number | boolean>;
      };
  reportProgress?: boolean;
  responseType?: 'json';
  withCredentials?: boolean;
  transferCache?:
    | {
        includeHeaders?: string[];
      }
    | boolean;
};
