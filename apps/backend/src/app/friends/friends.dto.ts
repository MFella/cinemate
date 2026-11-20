import { IsBoolean, IsEmail } from 'class-validator';

export class SendFriendRequestBody {
  @IsEmail()
  email: string;
}

export class RespondToFriendRequestBody {
  @IsBoolean()
  accept: boolean;
}
