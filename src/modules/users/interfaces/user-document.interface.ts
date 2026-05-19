import { Document, ObjectId } from 'mongodb';

export type MongoId = ObjectId | string | number;
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface UserDbDocument extends Document {
  _id?: MongoId;

  avatar_url?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  password_hash: string;
  department_id?: MongoId | null;
  role_id: MongoId;
  status: UserStatus;
  last_login_at?: Date | string | null;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
  deleted_at?: Date | string | null;

  // Dự phòng nếu DB cũ/cũ hơn có camelCase
  avatarUrl?: string | null;
  fullName?: string;
  passwordHash?: string;
  departmentId?: MongoId | null;
  roleId?: MongoId;
  lastLoginAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  deletedAt?: Date | string | null;
}

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
  lastLoginAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  deletedAt?: Date | string | null;
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

export interface UpdateUserInput {
  fullName?: string;
  email?: string;
  phone?: string | null;
  roleId?: MongoId;
  departmentId?: MongoId | null;
  status?: UserStatus;
  avatarUrl?: string | null;
}