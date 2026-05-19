import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Tối thiểu 8 ký tự, có chữ hoa, chữ thường và ký tự đặc biệt',
  })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/, {
    message:
      'Mật khẩu phải từ 8 ký tự, bao gồm chữ hoa, chữ thường và ký tự đặc biệt',
  })
  password: string;
}
