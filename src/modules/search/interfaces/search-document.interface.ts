import { Document, ObjectId } from 'mongodb';

export type AccessLevel = 'public' | 'internal' | 'restricted';
export type MongoId = ObjectId | string;

export interface DocumentCategoryDocument extends Document {
  _id: MongoId;
  name: string;
  accessLevel: AccessLevel;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface KnowledgeDocumentDocument extends Document {
  _id: MongoId;
  categoryId: MongoId;
  schoolId?: MongoId | null;
  productId?: MongoId | null;
  title: string;
  fileUrl: string;
  fileType?: string | null;
  isAiTrainingSource?: boolean;
  uploadedById?: MongoId | null;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
