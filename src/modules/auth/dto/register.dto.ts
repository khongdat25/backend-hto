import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  fullName: string;

  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @Matches(/^[a-zA-Z0-9._%+-]+@gmail\.com$/, {
    message: 'Email phải là địa chỉ Gmail hợp lệ (ví dụ: example@gmail.com)',
  })
  email: string;

  @ApiProperty({ example: 'Password@123', description: 'Tối thiểu 8 ký tự, có chữ hoa, chữ thường và ký tự đặc biệt' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/, {
    message: 'Mật khẩu phải từ 8 ký tự, bao gồm chữ hoa, chữ thường và ký tự đặc biệt',
  })
  password: string;

}
