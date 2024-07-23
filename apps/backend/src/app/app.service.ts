import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  private static readonly API_URL = 'https://mood2movie.com/api/movies/Adventure?page=1';

  constructor(private readonly httpService: HttpService){}

  async getData(): Promise<any> {
    try {
      const response = await firstValueFrom(this.httpService.post(AppService.API_URL, {}));
      return response?.data;
    } catch (err: unknown) {
      console.log('Error occured', err);
    }
  }
}
