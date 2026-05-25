import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsNumber, IsOptional, Min } from 'class-validator';

export class GetDocumentsDto {
  @ApiProperty({
    description: 'Lọc tài liệu theo sản phẩm (ID của Product)',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  productId?: string;

  @ApiProperty({
    description: 'Lọc tài liệu theo danh mục',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    description: 'Trang hiện tại (bắt đầu từ 1)',
    required: false,
    default: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Số tài liệu mỗi trang',
    required: false,
    default: 20,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
