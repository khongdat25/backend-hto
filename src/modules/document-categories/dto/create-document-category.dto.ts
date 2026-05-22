import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDocumentCategoryDto {
  @ApiProperty({ description: 'Tên danh mục tài liệu' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Mô tả danh mục tài liệu', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
