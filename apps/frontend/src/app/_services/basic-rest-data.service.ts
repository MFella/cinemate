import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export abstract class BasicRestDataService {
  private static readonly API_URL_SUFFIX = 'api';

  constructor(protected readonly httpClient: HttpClient) { }

  protected get<T>(urlSuffix: string): Observable<T> {
    return this.httpClient.get<T>(`${BACKEND_API_URL}/${BasicRestDataService.API_URL_SUFFIX}/${urlSuffix}`);
  }

  protected post<T>(urlSuffix: string, body: any | null): Observable<T> {
    return this.httpClient.post<T>(`${BACKEND_API_URL}/${BasicRestDataService.API_URL_SUFFIX}/${urlSuffix}`, body);
  }
}
