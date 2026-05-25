import { Injectable } from '@nestjs/common';
import { Filter, ObjectId, UpdateFilter, UpdateResult } from 'mongodb';
import { DatabaseService } from '../../database/database.service';
import {
  CreateUserInput,
  MongoId,
  UpdateUserInput,
  UserDbDocument,
  UserDocument,
  UserStatus,
} from './interfaces/user-document.interface';

interface LookupDocument {
  _id?: MongoId;
  status?: string;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private get collection() {
    return this.databaseService.collection<UserDbDocument>('users');
  }

  private get rolesCollection() {
    return this.databaseService.collection<LookupDocument>('roles');
  }

  private get departmentsCollection() {
    return this.databaseService.collection<LookupDocument>('departments');
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    const user = await this.collection.findOne({
      email,
      ...notDeletedFilter(),
    });

    return mapDbUserToUser(user);
  }

  async findById(id: string): Promise<UserDocument | null> {
    const user = await this.collection.findOne({
      ...buildIdFilter(id),
      ...notDeletedFilter(),
    });

    return mapDbUserToUser(user);
  }

  async findAll(filter: {
    keyword?: string;
    status?: UserStatus;
    roleId?: string;
    departmentId?: string;
  }): Promise<UserDocument[]> {
    const andConditions: Filter<UserDbDocument>[] = [notDeletedFilter()];

    if (filter.keyword) {
      andConditions.push({
        $or: [
          { full_name: { $regex: filter.keyword, $options: 'i' } },
          { email: { $regex: filter.keyword, $options: 'i' } },
          { phone: { $regex: filter.keyword, $options: 'i' } },
        ],
      });
    }

    if (filter.status) {
      andConditions.push({ status: filter.status });
    }

    if (filter.roleId) {
      andConditions.push({
        role_id: filter.roleId,
      });
    }

    if (filter.departmentId) {
      andConditions.push({
        department_id: {
          $in: buildPossibleStoredIds(filter.departmentId),
        },
      });
    }

    const users = await this.collection
      .find({ $and: andConditions })
      .sort({ created_at: -1 })
      .toArray();

    return users
      .map((user) => mapDbUserToUser(user))
      .filter((user): user is UserDocument => user !== null);
  }

  async create(user: CreateUserInput): Promise<UserDocument> {
    const dataToInsert: UserDbDocument = {
      _id: new ObjectId().toHexString(),
      full_name: user.fullName,
      email: user.email,
      password_hash: user.passwordHash,
      role_id: String(user.roleId),
      department_id: user.departmentId
        ? toDepartmentStoredId(user.departmentId)
        : null,
      status: user.status || 'active',
      avatar_url: user.avatarUrl || null,
      phone: user.phone || null,
      last_login_at: null,
      created_at: new Date(),
      updated_at: null,
      deleted_at: null,
    };

    await this.collection.insertOne(dataToInsert);

    return mapDbUserToUser(dataToInsert) as UserDocument;
  }

  async updateById(
    id: string,
    userData: UpdateUserInput,
  ): Promise<UserDocument | null> {
    const updateData: Partial<UserDbDocument> = {
      updated_at: new Date(),
    };

    if (userData.fullName !== undefined) {
      updateData.full_name = userData.fullName;
    }

    if (userData.email !== undefined) {
      updateData.email = userData.email;
    }

    if (userData.phone !== undefined) {
      updateData.phone = userData.phone;
    }

    if (userData.avatarUrl !== undefined) {
      updateData.avatar_url = userData.avatarUrl;
    }

    if (userData.status !== undefined) {
      updateData.status = userData.status;
    }

    if (userData.roleId !== undefined) {
      updateData.role_id = String(userData.roleId);
    }

    if (userData.departmentId !== undefined) {
      updateData.department_id = userData.departmentId
        ? toDepartmentStoredId(userData.departmentId)
        : null;
    }

    await this.collection.updateOne(
      {
        ...buildIdFilter(id),
        ...notDeletedFilter(),
      },
      {
        $set: updateData,
      },
    );

    return await this.findById(id);
  }

  async updateStatusById(
    id: string,
    status: UserStatus,
  ): Promise<UserDocument | null> {
    await this.collection.updateOne(
      {
        ...buildIdFilter(id),
        ...notDeletedFilter(),
      },
      {
        $set: {
          status,
          updated_at: new Date(),
        },
      },
    );

    return await this.findById(id);
  }

  async updatePassword(
    userId: string,
    passwordHash: string,
  ): Promise<UpdateResult<UserDbDocument>> {
    const updateDoc: UpdateFilter<UserDbDocument> = {
      $set: {
        password_hash: passwordHash,
        updated_at: new Date(),
      },
    };

    return await this.collection.updateOne(
      {
        ...buildIdFilter(userId),
        ...notDeletedFilter(),
      },
      updateDoc,
    );
  }

  async softDeleteById(id: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      {
        ...buildIdFilter(id),
        ...notDeletedFilter(),
      },
      {
        $set: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  async roleExists(roleId: string): Promise<boolean> {
    const possibleIds = buildPossibleStoredIds(roleId);

    const role = await this.rolesCollection.findOne({
      status: 'active',
      $or: possibleIds.map((id) => ({ _id: id })),
    });

    return Boolean(role);
  }

  async departmentExists(departmentId: string): Promise<boolean> {
    const possibleIds = buildPossibleStoredIds(departmentId);

    const department = await this.departmentsCollection.findOne({
      status: 'active',
      $or: possibleIds.map((id) => ({ _id: id })),
    });

    return Boolean(department);
  }
}

function buildIdFilter(id: string): Filter<UserDbDocument> {
  if (!ObjectId.isValid(id)) {
    return { _id: id };
  }

  return { _id: { $in: [id, new ObjectId(id)] } };
}

function notDeletedFilter(): Filter<UserDbDocument> {
  return {
    $or: [
      { deleted_at: null },
      { deleted_at: { $exists: false } },
      { deletedAt: null },
      { deletedAt: { $exists: false } },
    ],
  };
}

function buildPossibleStoredIds(id: MongoId): MongoId[] {
  const values: MongoId[] = [id];

  if (typeof id === 'string') {
    if (!values.includes(id)) {
      values.push(id);
    }

    if (ObjectId.isValid(id)) {
      values.push(new ObjectId(id));
    }

    const numberValue = Number(id);
    if (!Number.isNaN(numberValue)) {
      values.push(numberValue);
    }
  }

  return values;
}

function toDepartmentStoredId(id: MongoId): MongoId {
  if (typeof id === 'string') {
    const numberValue = Number(id);

    if (!Number.isNaN(numberValue)) {
      return numberValue;
    }
  }

  return String(id);
}

function mapDbUserToUser(user: UserDbDocument | null): UserDocument | null {
  if (!user) return null;

  return {
    _id: user._id,
    avatarUrl: user.avatar_url ?? user.avatarUrl ?? null,
    fullName: user.full_name ?? user.fullName ?? '',
    email: user.email,
    phone: user.phone ?? null,
    passwordHash: user.password_hash ?? user.passwordHash ?? '',
    departmentId: user.department_id ?? user.departmentId ?? null,
    roleId: user.role_id ?? user.roleId ?? '',
    status: user.status,
    lastLoginAt: user.last_login_at ?? user.lastLoginAt ?? null,
    createdAt: user.created_at ?? user.createdAt ?? null,
    updatedAt: user.updated_at ?? user.updatedAt ?? null,
    deletedAt: user.deleted_at ?? user.deletedAt ?? null,
  };
}