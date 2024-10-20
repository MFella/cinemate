import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

const originPaths = ['genres', 'movies'] as const;
type PathParams<T extends OriginPaths = 'genres'> = T extends 'genres'
  ? Record<string, string>
  : {
      genreId: number;
      pageNumber: number;
    };

type OriginPaths = (typeof originPaths)[number];
const baseRestDataPaths: Map<
  OriginPaths,
  (pathParams: PathParams<OriginPaths>) => string
> = new Map<OriginPaths, (pathParams: PathParams<OriginPaths>) => string>([
  ['genres', () => 'genre/movie/list?language=en-US'],
  [
    'movies',
    (pathParams: PathParams<OriginPaths>) =>
      `discover/movie?language=en-US&${
        pathParams['pageNumber'] !== undefined
          ? 'page=' + pathParams['pageNumber']
          : ''
      }` +
      `${
        pathParams['genreId'] !== undefined && pathParams['genreId'] !== null
          ? '&with_genres=' + pathParams['genreId']
          : ''
      }`,
  ],
]);

@Injectable()
export class BaseRestDataService {
  private static API_URL: string;
  private static API_KEY: string;
  private static REQUEST_CONFIG: AxiosRequestConfig;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    BaseRestDataService.API_URL = this.configService.get<string>('tmdbApi.url');
    BaseRestDataService.API_KEY = this.configService.get<string>('tmdbApi.key');
    BaseRestDataService.REQUEST_CONFIG = {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${BaseRestDataService.API_KEY}`,
      },
    };
  }

  get<T>(
    originPath: OriginPaths,
    pathParams: PathParams<typeof originPath>
  ): Promise<AxiosResponse<T>> {
    const restDataPathResolveFn = baseRestDataPaths.get(originPath);
    return firstValueFrom(
      this.httpService.get<T>(
        BaseRestDataService.API_URL + restDataPathResolveFn(pathParams),
        BaseRestDataService.REQUEST_CONFIG
      )
    );
  }

  // post<T>(originPath: OriginPaths, data: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  //     return firstValueFrom(this.httpService.post<T>(BaseRestDataService.API_URL, data, config))
  // }
}
