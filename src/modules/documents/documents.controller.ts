import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { GetDocumentsDto } from './dto/get-documents.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tài liệu theo quyền của user hiện tại',
    description:
      'Tự động lọc theo role và phòng ban. Có thể lọc thêm theo productId để lấy tài liệu của sản phẩm cụ thể (ví dụ: Du học Đức).',
  })
  findAll(
    @Query() query: GetDocumentsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết tài liệu theo ID',
    description:
      'Trả về 404 nếu tài liệu không tồn tại hoặc user không có quyền xem.',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.findOne(id, user);
  }
}
