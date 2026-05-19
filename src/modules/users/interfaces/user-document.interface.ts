import { Document, ObjectId } from 'mongodb';

export type MongoId = ObjectId | string;
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface UserDocument extends Document {
  _id?: MongoId;
  avatarUrl?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  departmentId?: MongoId | null;
  roleId: MongoId;
  status: UserStatus;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  passwordHash: string;
  roleId: MongoId;
  departmentId?: MongoId | null;
  status?: UserStatus;
  avatarUrl?: string | null;
  phone?: string | null;
}
