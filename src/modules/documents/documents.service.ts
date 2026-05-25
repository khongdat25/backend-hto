import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentsRepository } from './documents.repository';
import { GetDocumentsDto } from './dto/get-documents.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Injectable()
export class DocumentsService {
  constructor(private readonly documentsRepository: DocumentsRepository) {}

  /**
   * Lấy danh sách tài liệu mà user hiện tại có quyền xem.
   * Tự động lọc theo role và phòng ban của user, kết hợp với productId nếu có.
   */
  async findAll(query: GetDocumentsDto, user: AuthenticatedUser) {
    return this.documentsRepository.findMany(
      query,
      user.roleId,
      user.departmentId,
    );
  }

  /**
   * Lấy chi tiết 1 tài liệu.
   * Ném 404 nếu không tồn tại, 403 nếu user không có quyền xem danh mục chứa tài liệu đó.
   */
  async findOne(id: string, user: AuthenticatedUser) {
    // Thử tìm tài liệu không kèm kiểm tra quyền để phân biệt 404 vs 403
    const document = await this.documentsRepository.findOne(
      id,
      user.roleId,
      user.departmentId,
    );

    if (document === null) {
      // Kiểm tra tài liệu có thực sự tồn tại không
      // Nếu không tìm thấy có thể do: (1) không tồn tại, (2) không có quyền
      // Trả về 404 chung để không lộ thông tin
      throw new NotFoundException(
        'Tài liệu không tồn tại hoặc bạn không có quyền truy cập',
      );
    }

    return document;
  }
}
