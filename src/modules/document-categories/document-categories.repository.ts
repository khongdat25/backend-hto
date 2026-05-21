import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { DatabaseService } from '../../database/database.service';
import { CreateDocumentCategoryDto } from './dto/create-document-category.dto';
import { UpdateDocumentCategoryDto } from './dto/update-document-category.dto';

@Injectable()
export class DocumentCategoriesRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private get collection() {
    return this.databaseService.collection('document_categories');
  }

  async create(data: CreateDocumentCategoryDto) {
    const dataToInsert = {
      name: data.name,
      description: data.description || null,
      accessLevel: 'internal', // Giá trị mặc định
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(dataToInsert);
    return { ...dataToInsert, _id: result.insertedId };
  }

  async findAll() {
    return await this.collection.find().toArray();
  }

  async findOne(id: string) {
    // Trả về null ngay nếu ID không hợp lệ
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async update(id: string, data: UpdateDocumentCategoryDto) {
    // Trả về null ngay nếu ID không hợp lệ
    if (!ObjectId.isValid(id)) return null;
    const updateDoc = {
      ...data,
      updatedAt: new Date(),
    };

    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc },
    );
    return this.findOne(id);
  }

  async remove(id: string) {
    // Trả về null ngay nếu ID không hợp lệ
    if (!ObjectId.isValid(id)) return null;
    return await this.collection.deleteOne({ _id: new ObjectId(id) });
  }
}
