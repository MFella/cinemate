import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../app/user/user.service';
import { PrismaService } from '../app/database/prisma.service';
import { genres } from '../app/typings/common';
import { Logger } from '@nestjs/common';

describe('MyService', () => {
  let userService: UserService;
  const mockUserGenre = {
    name: genres[0],
    id: 4,
  };

  const mockUserFromDb = {
    id: 1203123.0 as unknown as any,
    email: 'example@gmail.com',
    picture: '',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [UserService, PrismaService],
    }).compile();
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  it('should get default preferences, when preferences from db are empty', async () => {
    const expectedPreferences = genres.map(genre => {
      return {
        name: genre,
        id: genre === 'Adventure' ? 4 : null,
      };
    });
    jest
      .spyOn(userService['prismaService'].genre, 'findMany')
      .mockResolvedValue([]);
    expect(await userService.getAllPreferences()).toEqual(expectedPreferences);
  });

  it('should get user from db, when user is already registered', async () => {
    const expectedLogMessage = 'User already registered';
    jest
      .spyOn(userService['prismaService'].user, 'findFirst')
      .mockResolvedValue(mockUserFromDb);

    jest
      .spyOn(userService['prismaService'].genre, 'findFirst')
      .mockResolvedValueOnce(mockUserGenre);
    const loggerLogSpy = jest.spyOn(Logger, 'log');
    const registerUserResult = await userService.tryRegisterUser(
      mockUserFromDb.id,
      mockUserFromDb.email,
      mockUserFromDb.picture
    );

    expect(registerUserResult).toEqual(mockUserFromDb);
    expect(loggerLogSpy).toHaveBeenCalledWith(expectedLogMessage);
  });

  it('should not register user, when everything prisma related went wrong', async () => {
    const expectedErrorMessage = 'Cannot register user';
    jest
      .spyOn(userService['prismaService'].user, 'findFirst')
      .mockResolvedValue(null);
    jest
      .spyOn(userService['prismaService'].genre, 'findFirst')
      .mockResolvedValue(mockUserGenre);
    jest
      .spyOn(userService['prismaService'].user, 'create')
      .mockResolvedValue(null);

    const loggerErrorSpy = jest.spyOn(Logger, 'error');

    const registerUserResult = await userService.tryRegisterUser(
      mockUserFromDb.id,
      mockUserFromDb.email,
      mockUserFromDb.picture
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(expectedErrorMessage);
    expect(registerUserResult).toEqual(null);
  });

  it('should register user, when everything prisma related went well', async () => {
    const expectedLogMessage = 'User registered';
    jest
      .spyOn(userService['prismaService'].user, 'findFirst')
      .mockResolvedValue(null);
    jest
      .spyOn(userService['prismaService'].genre, 'findFirst')
      .mockResolvedValue(mockUserGenre);
    jest
      .spyOn(userService['prismaService'].user, 'create')
      .mockResolvedValue(mockUserFromDb);
    const loggerLogSpy = jest.spyOn(Logger, 'log');

    const registerUserResult = await userService.tryRegisterUser(
      mockUserFromDb.id,
      mockUserFromDb.email,
      mockUserFromDb.picture
    );

    expect(registerUserResult).toEqual(mockUserFromDb);
    expect(loggerLogSpy).toHaveBeenCalledWith(expectedLogMessage);
  });
});
