import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import type { UserStatus } from '../interfaces/user-document.interface';

const USER_STATUS_VALUES = {
  active: 'active',
  inactive: 'inactive',
  suspended: 'suspended',
} as const;

export class CreateUserDto {
  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Họ tên đầy đủ của người dùng',
  })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  fullName!: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email đăng nhập của người dùng',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Mật khẩu đăng nhập',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password!: string;

  @ApiPropertyOptional({
    example: '0909123456',
    description: 'Số điện thoại người dùng',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: '69fc5af582ef85451120772a',
    description: 'ID vai trò của người dùng',
  })
  @IsString()
  @IsNotEmpty({ message: 'Role ID không được để trống' })
  roleId!: string;

  @ApiPropertyOptional({
    example: '69fc6442da9357571068af14',
    description: 'ID phòng ban của người dùng',
  })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.png',
    description: 'Đường dẫn ảnh đại diện',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    enum: Object.values(USER_STATUS_VALUES),
    example: 'active',
    description: 'Trạng thái tài khoản người dùng',
  })
  @IsOptional()
  @IsEnum(USER_STATUS_VALUES, {
    message: 'Trạng thái phải là active, inactive hoặc suspended',
  })
  status?: UserStatus;
}