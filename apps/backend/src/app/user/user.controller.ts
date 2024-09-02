import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { UserId } from "../decorators/user-id.decorator";
import { UserService } from "./user.service";
import { UserPreferenceDto } from '../dtos/user-preference.dto';
import { Genre } from "@prisma/client";
import { RegisterUserDto } from "../dtos/user/register-user.dto";
import { UsersFilterQuery } from "../dtos/user/users-filter.query";
import { FindMatchResultDto } from "../dtos/user/find-match-result.dto";
import { UserMatchQuery } from "../dtos/user/user-match.query";

type UserPreferenceBody = {
    genreId: number
};

@Controller('user')
export class UserController {
    constructor (private readonly userService: UserService) {}

    @Post('preference')
    async saveUserPreference(@UserId() userId: number, @Body() preferenceBody: UserPreferenceBody): Promise<boolean> {
        return await this.userService.saveUserPreference(userId, preferenceBody.genreId);
    }

    @Get('preference')
    async getUserPreference(@UserId() userId: number): Promise<UserPreferenceDto> {
        return this.userService.getUserPreference(userId);
    }

    @Get('preferences')
    async getAllPreferences(): Promise<Array<Genre>> {
        return this.userService.getAllPreferences();
    }

    @Post('register')
    async registerUser(@Body() registerUserDto: RegisterUserDto): Promise<boolean> {
        return this.userService.tryRegisterUser(registerUserDto.id, registerUserDto.email);
    }

    @Get('emails')
    async getUsersEmails(@Query() usersFilterQuery: UsersFilterQuery): Promise<Array<string>> {
        return this.userService.getUsersEmails(usersFilterQuery.startsWith);
    }

    @Get('match')
    async getUserMatch(@UserId() userId: number, @Query() userMatchQuery: UserMatchQuery): Promise<FindMatchResultDto> {
        return this.userService.getUserMatch(userId, parseInt(userMatchQuery.genreId), userMatchQuery.mailOfUsers,
            userMatchQuery.onlyUnwatched, userMatchQuery.onlyWatched, userMatchQuery.searchedMovieTitle);
    }
}
