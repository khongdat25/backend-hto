import { Module } from '@nestjs/common';
import { DocumentCategoriesService } from './document-categories.service';
import { DocumentCategoriesController } from './document-categories.controller';
import { DocumentCategoriesRepository } from './document-categories.repository';

@Module({
  controllers: [DocumentCategoriesController],
  providers: [DocumentCategoriesService, DocumentCategoriesRepository],
  exports: [DocumentCategoriesService],
})
export class DocumentCategoriesModule {}
