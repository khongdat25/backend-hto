import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { DatabaseService } from '../../database/database.service';
import { ROLE_IDS } from '../../common/constants/role.constants';
import { GetDocumentsDto } from './dto/get-documents.dto';

// Kiểu trả về của $facet trong aggregate danh sách tài liệu
interface DocumentFacetResult {
  data: Record<string, unknown>[];
  total: { count: number }[];
}

@Injectable()
export class DocumentsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private get documentsCollection() {
    return this.databaseService.collection('documents');
  }

  /**
   * Lấy danh sách tài liệu mà user có quyền xem.
   * Quy tắc phân quyền theo danh mục:
   *   - allowedRoleIds rỗng = tất cả role đều được xem
   *   - allowedDepartmentIds rỗng = tất cả phòng ban đều được xem
   *   - Nếu cả hai đều có giá trị thì user phải thỏa ít nhất 1 trong 2 điều kiện (role HOẶC department)
   */
  async findMany(
    query: GetDocumentsDto,
    roleId: string,
    departmentId: string | null,
  ) {
    const { productId, categoryId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Build điều kiện filter tài liệu
    const matchDocument: Record<string, unknown> = {
      deletedAt: null,
      status: 'active',
    };

    // Lọc theo productId nếu có truyền vào
    if (productId && ObjectId.isValid(productId)) {
      matchDocument.productId = new ObjectId(productId);
    }

    // Lọc theo categoryId nếu có truyền vào
    if (categoryId && ObjectId.isValid(categoryId)) {
      matchDocument.categoryId = new ObjectId(categoryId);
    }

    // Điều kiện kiểm tra quyền xem theo danh mục:
    // Danh mục cho phép nếu:
    //   1. allowedRoleIds = [] (không giới hạn role) VÀ allowedDepartmentIds = [] (không giới hạn phòng ban)
    //   2. roleId của user nằm trong allowedRoleIds
    //   3. departmentId của user nằm trong allowedDepartmentIds
    const roleObjectId = new ObjectId(roleId);
    const permissionCondition: Record<string, unknown>[] = [
      // Danh mục không giới hạn bất kỳ ai
      {
        'category.allowedRoleIds': { $size: 0 },
        'category.allowedDepartmentIds': { $size: 0 },
      },
      // User có role được phép
      { 'category.allowedRoleIds': roleObjectId },
    ];

    // Thêm điều kiện phòng ban nếu user thuộc phòng ban nào đó
    if (departmentId && ObjectId.isValid(departmentId)) {
      permissionCondition.push({
        'category.allowedDepartmentIds': new ObjectId(departmentId),
      });
    }

    const pipeline: any[] = [
      { $match: matchDocument },
      // Join với collection document_categories để kiểm tra quyền
      {
        $lookup: {
          from: 'document_categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: false } },
    ];

    // Chỉ áp dụng điều kiện phân quyền nếu không phải là ADMIN
    if (roleId !== ROLE_IDS.ADMIN && roleId !== ROLE_IDS.BGD) {
      pipeline.push({ $match: { $or: permissionCondition } });
    }

    // Đếm tổng số tài liệu (trước khi phân trang)
    pipeline.push({
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              title: 1,
              fileUrl: 1,
              fileType: 1,
              productId: 1,
              schoolId: 1,
              isAiTrainingSource: 1,
              status: 1,
              createdAt: 1,
              updatedAt: 1,
              category: {
                _id: '$category._id',
                name: '$category.name',
                accessLevel: '$category.accessLevel',
              },
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    });

    const result = await this.documentsCollection
      .aggregate<DocumentFacetResult>(pipeline)
      .toArray();

    const data = result[0]?.data ?? [];
    const total = result[0]?.total?.[0]?.count ?? 0;

    return { data, total, page, limit };
  }

  /**
   * Lấy chi tiết 1 tài liệu, kèm kiểm tra quyền xem theo danh mục.
   * Trả về null nếu tài liệu không tồn tại hoặc user không có quyền.
   */
  async findOne(
    id: string,
    roleId: string,
    departmentId: string | null,
  ): Promise<Record<string, unknown> | null> {
    if (!ObjectId.isValid(id)) return null;

    const roleObjectId = new ObjectId(roleId);

    const permissionCondition: Record<string, unknown>[] = [
      {
        'category.allowedRoleIds': { $size: 0 },
        'category.allowedDepartmentIds': { $size: 0 },
      },
      { 'category.allowedRoleIds': roleObjectId },
    ];

    if (departmentId && ObjectId.isValid(departmentId)) {
      permissionCondition.push({
        'category.allowedDepartmentIds': new ObjectId(departmentId),
      });
    }

    const pipeline: any[] = [
      { $match: { _id: new ObjectId(id), deletedAt: null } },
      {
        $lookup: {
          from: 'document_categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: false } },
    ];

    if (roleId !== ROLE_IDS.ADMIN && roleId !== ROLE_IDS.BGD) {
      pipeline.push({ $match: { $or: permissionCondition } });
    }

    pipeline.push({
      $project: {
        _id: 1,
        title: 1,
        fileUrl: 1,
        fileType: 1,
        productId: 1,
        schoolId: 1,
        isAiTrainingSource: 1,
        status: 1,
        uploadedById: 1,
        createdAt: 1,
        updatedAt: 1,
        category: {
          _id: '$category._id',
          name: '$category.name',
          accessLevel: '$category.accessLevel',
        },
      },
    });

    const result = await this.documentsCollection
      .aggregate<Record<string, unknown>>(pipeline)
      .toArray();

    return result[0] ?? null;
  }
}
