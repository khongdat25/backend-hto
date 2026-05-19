import { Injectable } from '@nestjs/common';
import { Document, Filter, Sort } from 'mongodb';
import { DatabaseService } from '../../database/database.service';
import {
  AccessLevel,
  DocumentCategoryDocument,
  KnowledgeDocumentDocument,
  MongoId,
} from './interfaces/search-document.interface';

type SoftDeletableDocument = Document & {
  deletedAt?: Date | null;
};

@Injectable()
export class SearchRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private get documentCollection() {
    return this.databaseService.collection<KnowledgeDocumentDocument>(
      'documents',
    );
  }

  private get categoryCollection() {
    return this.databaseService.collection<DocumentCategoryDocument>(
      'document_categories',
    );
  }

  async findCategories(
    filter: Filter<DocumentCategoryDocument>,
  ): Promise<DocumentCategoryDocument[]> {
    return await this.categoryCollection
      .find(this.withNotDeleted(filter))
      .toArray();
  }

  async findCategoryIdsByAccessLevels(
    accessLevels: AccessLevel[],
  ): Promise<MongoId[]> {
    const categories = await this.findCategories({
      accessLevel: { $in: accessLevels },
    });

    return categories.map((category) => category._id);
  }

  async findDocuments(
    filter: Filter<KnowledgeDocumentDocument>,
    options: { skip: number; limit: number; sort: Sort },
  ): Promise<KnowledgeDocumentDocument[]> {
    return await this.documentCollection
      .find(this.withNotDeleted(filter))
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .toArray();
  }

  async countDocuments(
    filter: Filter<KnowledgeDocumentDocument>,
  ): Promise<number> {
    return await this.documentCollection.countDocuments(
      this.withNotDeleted(filter),
    );
  }

  private withNotDeleted<TDocument extends SoftDeletableDocument>(
    filter: Filter<TDocument>,
  ): Filter<TDocument> {
    const notDeletedFilter = {
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    } as Filter<TDocument>;

    if (Object.keys(filter).length === 0) {
      return notDeletedFilter;
    }

    return { $and: [filter, notDeletedFilter] } as Filter<TDocument>;
  }
}
