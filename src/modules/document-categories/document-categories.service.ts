import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentCategoriesRepository } from './document-categories.repository';
import { CreateDocumentCategoryDto } from './dto/create-document-category.dto';
import { UpdateDocumentCategoryDto } from './dto/update-document-category.dto';

@Injectable()
export class DocumentCategoriesService {
  constructor(
    private readonly documentCategoriesRepository: DocumentCategoriesRepository,
  ) {}

  async create(createDocumentCategoryDto: CreateDocumentCategoryDto) {
    return this.documentCategoriesRepository.create(createDocumentCategoryDto);
  }

  async findAll() {
    return this.documentCategoriesRepository.findAll();
  }

  async findOne(id: string) {
    const category = await this.documentCategoriesRepository.findOne(id);
    if (!category) {
      throw new NotFoundException('Danh mục tài liệu không tồn tại');
    }
    return category;
  }

  async update(
    id: string,
    updateDocumentCategoryDto: UpdateDocumentCategoryDto,
  ) {
    // Kiểm tra danh mục có tồn tại hay không trước khi sửa
    const existingCategory =
      await this.documentCategoriesRepository.findOne(id);
    if (!existingCategory) {
      throw new NotFoundException(
        'Danh mục tài liệu không tồn tại để cập nhật',
      );
    }

    return this.documentCategoriesRepository.update(
      id,
      updateDocumentCategoryDto,
    );
  }

  async toggleVisibility(id: string) {
    // Kiểm tra danh mục có tồn tại hay không
    const existingCategory =
      await this.documentCategoriesRepository.findOne(id);
    if (!existingCategory) {
      throw new NotFoundException('Danh mục tài liệu không tồn tại');
    }

    return this.documentCategoriesRepository.toggleVisibility(id);
  }
}
