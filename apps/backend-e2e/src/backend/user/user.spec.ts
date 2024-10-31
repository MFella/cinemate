import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserController } from 'backend/user/user.controller';
import { UserService } from '../../../../backend/src/app/user/user.service';
import request from 'supertest';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../../backend/src/app/database/prisma.service';
import { AuthGuard } from '../../../../backend/src/app/_guards/auth.guard';
import { createTestApp, getMockAuthGuard } from '../../mocks/auth.mocks';
import { genres } from 'backend/typings/common';
import { FindMatchResultDto } from 'backend/dtos/user/find-match-result.dto';
import { Rate } from 'backend/dtos/rate-of-movie';
import { UserMatchQuery } from 'backend/dtos/user/user-match.query';

describe('User paths test', () => {
  let app: INestApplication;
  let prismaMock: DeepMockProxy<PrismaClient>;
  let userService: UserService;

  beforeAll(async () => {
    prismaMock = mockDeep<PrismaClient>();
    const moduleRef = await Test.createTestingModule({
      controllers: [UserController],
      providers: [PrismaService, UserService],
    })
      .overrideGuard(AuthGuard)
      .useValue(getMockAuthGuard(true))
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = createTestApp(moduleRef);
    userService = moduleRef.get(UserService);

    await app.init();
  });

  it('/POST preference should save user preference', async () => {
    jest.spyOn(userService, 'saveUserPreference').mockResolvedValue(true);

    return await request(app.getHttpServer())
      .post('/api/user/preference')
      .set({ genreId: 123 })
      .expect(201)
      .expect(response => {
        expect(response.text).toEqual('true');
        expect(response.ok).toEqual(true);
      });
  });

  it('/GET preference should return current user preference', async () => {
    const expectedUserPreference = {
      preference: {
        name: 'Comedy',
        id: 16,
      },
    };

    jest
      .spyOn(userService, 'getUserPreference')
      .mockResolvedValue(expectedUserPreference);

    return await request(app.getHttpServer())
      .get('/api/user/preference')
      .expect(200)
      .expect(expectedUserPreference);
  });

  it('/GET preferences should return list of preferences', async () => {
    const expectedUserPreferences = Array(4)
      .fill(undefined)
      .map(_ => ({
        id: Math.floor(Math.random() * genres.length),
        name: genres[Math.floor(Math.random() * genres.length)],
      }));

    jest
      .spyOn(userService, 'getAllPreferences')
      .mockResolvedValue(expectedUserPreferences);
    return await request(app.getHttpServer())
      .get('/api/user/preferences')
      .expect(200)
      .expect(expectedUserPreferences);
  });

  it('/GET emails should return user emails list', async () => {
    const expectedEmailList = [
      'example1@gmail.com',
      'example12@gmail.com',
      'example23@gmail.com',
    ];
    const expectedUserEmailFilterQuery = { startsWith: 'example1' };

    const getUsersEmailsSpy = jest
      .spyOn(userService, 'getUsersEmails')
      .mockResolvedValue(expectedEmailList);

    return await request(app.getHttpServer())
      .get('/api/user/emails')
      .query(expectedUserEmailFilterQuery)
      .expect(200)
      .expect(expectedEmailList)
      .expect(() => {
        expect(getUsersEmailsSpy).toHaveBeenCalledWith(
          expectedUserEmailFilterQuery.startsWith
        );
      });
  });

  it('/GET match should return findMatchResultDTO', async () => {
    const expectedFindMatchResultDTO: FindMatchResultDto = {
      isLastPage: true,
      matchedRateValue: Rate.YES,
      matchedRates: [],
    };

    const expectedUserMatchQuery: UserMatchQuery = {
      genreId: '4',
      mailOfUsers: ['', 'example@gmail.com'],
      pageNumber: '0',
    };

    const getUserMatchSpy = jest
      .spyOn(userService, 'getUserMatch')
      .mockResolvedValue(expectedFindMatchResultDTO);

    return await request(app.getHttpServer())
      .get('/api/user/match')
      .query(expectedUserMatchQuery)
      .expect(200)
      .expect(expectedFindMatchResultDTO)
      .expect(() =>
        expect(getUserMatchSpy).toHaveBeenCalledWith(
          undefined,
          parseInt(expectedUserMatchQuery.genreId),
          expectedUserMatchQuery.mailOfUsers,
          parseInt(expectedUserMatchQuery.pageNumber),
          undefined,
          undefined,
          undefined
        )
      );
  });
});
