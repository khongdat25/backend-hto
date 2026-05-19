import { Injectable } from '@nestjs/common';
import { Filter } from 'mongodb';
import { ROLE_IDS } from '../../common/constants/role.constants';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { SearchDocumentDto } from './dto/search-document.dto';
import {
  AccessLevel,
  KnowledgeDocumentDocument,
  MongoId,
} from './interfaces/search-document.interface';
import { SearchRepository } from './search.repository';

@Injectable()
export class SearchService {
  constructor(private readonly searchRepository: SearchRepository) {}

  async searchDocuments(query: SearchDocumentDto, user?: AuthenticatedUser) {
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const skip = (page - 1) * limit;
    const filter = await this.buildFilter(query, user);
    const [items, total] = await Promise.all([
      this.searchRepository.findDocuments(filter, {
        skip,
        limit,
        sort: { createdAt: -1 },
      }),
      this.searchRepository.countDocuments(filter),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  private async buildFilter(
    query: SearchDocumentDto,
    user?: AuthenticatedUser,
  ): Promise<Filter<KnowledgeDocumentDocument>> {
    const andConditions: Filter<KnowledgeDocumentDocument>[] = [];
    const keyword = query.keyword?.trim();

    if (keyword) {
      andConditions.push(await this.buildKeywordFilter(keyword));
    }

    if (!isElevatedUser(user)) {
      const accessLevels: AccessLevel[] = user
        ? ['public', 'internal']
        : ['public'];
      const categoryIds =
        await this.searchRepository.findCategoryIdsByAccessLevels(accessLevels);

      andConditions.push({
        categoryId: { $in: expandMongoIds(categoryIds) },
        status: 'active',
      });
    }

    if (andConditions.length === 0) {
      return {};
    }

    return { $and: andConditions };
  }

  private async buildKeywordFilter(
    keyword: string,
  ): Promise<Filter<KnowledgeDocumentDocument>> {
    const keywordRegex = new RegExp(escapeRegExp(keyword), 'i');
    const categories = await this.searchRepository.findCategories({
      name: keywordRegex,
    });
    const matchingCategoryIds = expandMongoIds(
      categories.map((category) => category._id),
    );
    const keywordConditions: Filter<KnowledgeDocumentDocument>[] = [
      { title: keywordRegex },
      { fileType: keywordRegex },
      { fileUrl: keywordRegex },
    ];

    if (matchingCategoryIds.length > 0) {
      keywordConditions.push({ categoryId: { $in: matchingCategoryIds } });
    }

    return { $or: keywordConditions };
  }
}

function isElevatedUser(user?: AuthenticatedUser): boolean {
  return Boolean(user && [ROLE_IDS.ADMIN, ROLE_IDS.BGD].includes(user.roleId));
}

function expandMongoIds(ids: MongoId[]): MongoId[] {
  const expandedIds = new Map<string, MongoId>();

  for (const id of ids) {
    expandedIds.set(id.toString(), id);
    expandedIds.set(`string:${id.toString()}`, id.toString());
  }

  return Array.from(expandedIds.values());
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
