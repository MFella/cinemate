import { Module } from '@nestjs/common';
import { PrismaService } from '../../app/database/prisma.service';
import { Genre, User } from '@prisma/client';

export const mockUserFromDb = {
  id: 123.0 as any,
  email: 'example@gmail.com',
  genreId: 4,
  picture: '',
} satisfies User;

class MockPrismaService {
  genre = {
    findMany: (genres: Array<Genre>): Array<Genre> => genres,
  };
}

@Module({
  providers: [{ provide: PrismaService, useClass: MockPrismaService }],
})
export class TestingHelperModule {}
