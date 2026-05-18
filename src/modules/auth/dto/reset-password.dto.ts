import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token đặt lại mật khẩu nhận từ email' })
  @IsNotEmpty({ message: 'Token không được để trống' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewPassword@123', description: 'Tối thiểu 8 ký tự, có chữ hoa, chữ thường và ký tự đặc biệt' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/, {
    message: 'Mật khẩu phải từ 8 ký tự, bao gồm chữ hoa, chữ thường và ký tự đặc biệt',
  })
  password: string;
}
