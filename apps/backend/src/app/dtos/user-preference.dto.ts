import { Genre } from '@prisma/client';

export type UserPreferenceDto = {
  preferences: Array<Genre>;
};
