import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import type { UserStatus } from '../interfaces/user-document.interface';

const USER_STATUS_VALUES = {
  active: 'active',
  inactive: 'inactive',
  suspended: 'suspended',
} as const;

export class QueryUsersDto {
  @ApiPropertyOptional({
    example: 'admin',
    description: 'Từ khóa tìm kiếm theo họ tên, email hoặc số điện thoại',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    enum: Object.values(USER_STATUS_VALUES),
    example: 'active',
    description: 'Lọc theo trạng thái người dùng',
  })
  @IsOptional()
  @IsEnum(USER_STATUS_VALUES, {
    message: 'Trạng thái phải là active, inactive hoặc suspended',
  })
  status?: UserStatus;

  @ApiPropertyOptional({
    example: '69fc5af582ef85451120772a',
    description: 'Lọc theo ID vai trò',
  })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({
    example: '69fc6442da9357571068af14',
    description: 'Lọc theo ID phòng ban',
  })
  @IsOptional()
  @IsString()
  departmentId?: string;
}