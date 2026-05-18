import { Injectable } from '@nestjs/common';
import { SearchDocumentDto } from './dto/search-document.dto';
import { ROLE_IDS } from '../../common/constants/role.constants';
import { SearchRepository } from './search.repository';

@Injectable()
export class SearchService {
  constructor(private readonly searchRepository: SearchRepository) { }

  async searchDocuments(query: SearchDocumentDto, user?: any) {
    const { keyword, limit = 10, page = 1 } = query;
    const skip = (page - 1) * limit;

    const filter: any = { deletedAt: null };

    // --- LOGIC TÌM KIẾM THÔNG MINH TRÊN 1 Ô DUY NHẤT ---
    if (keyword) {
      const searchRegex = { $regex: keyword, $options: 'i' };
      
      // 1. Tìm các Danh mục hoặc Phòng ban có tên chứa từ khóa
      const [categories, departments] = await Promise.all([
        this.searchRepository.findCategories({ name: searchRegex }),
        this.searchRepository.findDepartments({ name: searchRegex })
      ]);

      const catIds = categories.flatMap(c => [c._id, c.id].filter(id => id != null));
      const deptIds = departments.flatMap(d => [d._id, d.id].filter(id => id != null));

      // 2. Xây dựng $or filter cho tất cả các trường (theo chuẩn camelCase của Prisma)
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { categoryId: { $in: catIds } },
        { departmentId: { $in: deptIds } },
      ];
    }

    // --- LOGIC PHÂN QUYỀN ---
    const ROLE_ADMIN = ROLE_IDS.ADMIN;
    const ROLE_BGD = ROLE_IDS.BGD;

    if (!user) {
      filter.status = 'active';
      filter.required_role_id = { $in: [null, undefined, ''] };
    } else {
      const userRole = user.roleId;
      const userDept = user.departmentId;

      if (userRole !== ROLE_ADMIN && userRole !== ROLE_BGD) {
        const rbacConditions: any = {
          $and: [
            { $or: [{ departmentId: userDept }, { department_id: userDept }] },
            { 
              $or: [
                { required_role_id: userRole },
                { required_role_id: { $exists: false } },
                { required_role_id: null },
                { required_role_id: '' }
              ] 
            }
          ]
        };
        if (filter.$and) filter.$and.push(rbacConditions);
        else filter.$and = [rbacConditions];
      }
    }

    const [items, total] = await Promise.all([
      this.searchRepository.findDocuments(filter, {
        skip,
        limit: Number(limit),
        sort: { createdAt: -1 }
      }),
      this.searchRepository.countDocuments(filter),
    ]);

    if (total === 0) {
      return {
        items: [],
        meta: {
          total: 0,
          page: Number(page),
          limit: Number(limit),
          totalPages: 0,
        },
      };
    }

    return {
      items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
