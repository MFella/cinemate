import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../_guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { FriendsOverview, FriendsService } from './friends.service';
import {
  RespondToFriendRequestBody,
  SendFriendRequestBody,
} from './friends.dto';

@Controller('friends')
@UseGuards(AuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  async list(@UserId() userId: string): Promise<FriendsOverview> {
    return this.friendsService.list(userId);
  }

  @Post('request')
  async sendRequest(
    @UserId() userId: string,
    @Body() body: SendFriendRequestBody
  ): Promise<boolean> {
    await this.friendsService.sendRequest(userId, body.email);
    return true;
  }

  @Post(':friendshipId/respond')
  async respond(
    @UserId() userId: string,
    @Param('friendshipId') friendshipId: string,
    @Body() body: RespondToFriendRequestBody
  ): Promise<boolean> {
    await this.friendsService.respond(userId, friendshipId, body.accept);
    return true;
  }

  @Delete(':userId')
  async remove(
    @UserId() userId: string,
    @Param('userId') otherUserId: string
  ): Promise<boolean> {
    await this.friendsService.remove(userId, otherUserId);
    return true;
  }
}
