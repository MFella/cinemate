import { IsEmail, IsNumber } from 'class-validator';

export class RegisterUserDto {
    @IsNumber()
    id: number;

    @IsEmail()
    email: string;
}