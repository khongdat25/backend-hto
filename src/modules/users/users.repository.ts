import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly databaseService: DatabaseService) { }

  private get collection() {
    return this.databaseService.collection('users');
  }

  async findByEmail(email: string) {
    // Tìm kiếm user theo email trong MongoDB, hỗ trợ cả deletedAt là null hoặc không tồn tại
    return await this.collection.findOne({
      email,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    });
  }

  async findById(id: string) {
    const idFilter = ObjectId.isValid(id)
      ? { $in: [new ObjectId(id), id] }
      : id;

    return await this.collection.findOne({
      _id: idFilter as any,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    });
  }

  async create(user: any) {
    // Map _id (nếu cần thiết cho relation) và gán mặc định các trường
    // Insert dữ liệu theo chuẩn camelCase của Prisma Schema
    const dataToInsert = {
      fullName: user.fullName,
      email: user.email,
      passwordHash: user.passwordHash,
      roleId: ObjectId.isValid(user.roleId) ? new ObjectId(user.roleId) : user.roleId,
      departmentId: user.departmentId && ObjectId.isValid(user.departmentId) ? new ObjectId(user.departmentId) : null,
      status: user.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      avatarUrl: user.avatarUrl || null,
      phone: user.phone || null,
    };

    const result = await this.collection.insertOne(dataToInsert);
    return { ...dataToInsert, _id: result.insertedId };
  }
}
