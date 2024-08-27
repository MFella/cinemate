import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export abstract class BasicRestDataService {
  private static readonly API_URL_SUFFIX = 'api';

  constructor(protected readonly httpClient: HttpClient) { }

  protected get<T>(urlSuffix: string, options?: HttpGetOptions): Observable<T> {
    return this.httpClient.get<T>(`${BACKEND_API_URL}/${BasicRestDataService.API_URL_SUFFIX}/${urlSuffix}`, options);
  }

  protected post<T>(urlSuffix: string, body: any | null): Observable<T> {
    return this.httpClient.post<T>(`${BACKEND_API_URL}/${BasicRestDataService.API_URL_SUFFIX}/${urlSuffix}`, body);
  }

  protected put<T>(urlSuffix: string, body: any | null): Observable<T> {
    return this.httpClient.put<T>(`${BACKEND_API_URL}/${BasicRestDataService.API_URL_SUFFIX}/${urlSuffix}`, body);
  }
}

type HttpGetOptions = {
  headers?: HttpHeaders | {
      [header: string]: string | string[];
  };
  context?: HttpContext;
  observe?: 'body';
  params?: HttpParams | {
      [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean>;
  };
  reportProgress?: boolean;
  responseType?: 'json';
  withCredentials?: boolean;
  transferCache?: {
      includeHeaders?: string[];
  } | boolean;
}
