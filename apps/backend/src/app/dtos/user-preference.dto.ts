import { Genre } from "@prisma/client";

export type UserPreferenceDto = {
    preference: Genre
};
