import { Body, Controller, Get, Post } from "@nestjs/common";
import { UserId } from "../decorators/user-id.decorator";
import { UserService } from "./user.service";
import { UserPreferenceDto } from '../dtos/user-preference.dto';
import { Genre } from "@prisma/client";

type UserPreferenceBody = {
    genreId: number
};

@Controller('user')
export class UserController {
    constructor (private readonly userService: UserService) {}

    @Post('preference')
    async saveUserPreference(@UserId() userId: string, @Body() preferenceBody: UserPreferenceBody): Promise<boolean> {
        return await this.userService.saveUserPreference(userId, preferenceBody.genreId);
    }

    @Get('preference')
    async getUserPreference(@UserId() userId: string): Promise<UserPreferenceDto> {
        return this.userService.getUserPreference(userId);
    }

    @Get('preferences')
    async getAllPreferences(): Promise<Array<Genre>> {
        return this.userService.getAllPreferences();
    }
}
