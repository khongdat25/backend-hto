import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import type { UserStatus } from '../interfaces/user-document.interface';

const USER_STATUS_VALUES = {
  active: 'active',
  inactive: 'inactive',
  suspended: 'suspended',
} as const;

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: Object.values(USER_STATUS_VALUES),
    example: 'active',
    description: 'Trạng thái mới của người dùng',
  })
  @IsEnum(USER_STATUS_VALUES, {
    message: 'Trạng thái phải là active, inactive hoặc suspended',
  })
  status!: UserStatus;
}