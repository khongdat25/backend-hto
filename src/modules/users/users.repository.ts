import { Injectable } from '@nestjs/common';
import { Filter, ObjectId, UpdateFilter, UpdateResult } from 'mongodb';
import { DatabaseService } from '../../database/database.service';
import {
  CreateUserInput,
  MongoId,
  UserDocument,
} from './interfaces/user-document.interface';

@Injectable()
export class UsersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private get collection() {
    return this.databaseService.collection<UserDocument>('users');
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return await this.collection.findOne({
      email,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return await this.collection.findOne({
      ...buildIdFilter(id),
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    });
  }

  async create(user: CreateUserInput): Promise<UserDocument> {
    const dataToInsert: UserDocument = {
      fullName: user.fullName,
      email: user.email,
      passwordHash: user.passwordHash,
      roleId: toStoredId(user.roleId),
      departmentId: user.departmentId ? toStoredId(user.departmentId) : null,
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

  async updatePassword(
    userId: string,
    passwordHash: string,
  ): Promise<UpdateResult<UserDocument>> {
    const updateDoc: UpdateFilter<UserDocument> = {
      $set: { passwordHash, updatedAt: new Date() },
    };

    return await this.collection.updateOne(buildIdFilter(userId), updateDoc);
  }
}

function buildIdFilter(id: string): Filter<UserDocument> {
  if (!ObjectId.isValid(id)) {
    return { _id: id };
  }

  return { _id: { $in: [new ObjectId(id), id] } };
}

function toStoredId(id: MongoId): MongoId {
  if (typeof id === 'string' && ObjectId.isValid(id)) {
    return new ObjectId(id);
  }

  return id;
}
