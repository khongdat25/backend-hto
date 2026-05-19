import { Document, ObjectId } from 'mongodb';

export interface PasswordResetTokenDocument extends Document {
  _id?: ObjectId;
  userId: ObjectId;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface RefreshTokenDocument extends Document {
  _id?: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date | null;
}
