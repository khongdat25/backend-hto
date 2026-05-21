import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentCategoriesService } from './document-categories.service';
import { CreateDocumentCategoryDto } from './dto/create-document-category.dto';
import { UpdateDocumentCategoryDto } from './dto/update-document-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Document Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('69fc5af582ef85451120772a', '69fc5af582ef85451120772b')
@Controller('document-categories')
export class DocumentCategoriesController {
  constructor(
    private readonly documentCategoriesService: DocumentCategoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new document category' })
  create(@Body() createDocumentCategoryDto: CreateDocumentCategoryDto) {
    return this.documentCategoriesService.create(createDocumentCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all document categories' })
  findAll() {
    return this.documentCategoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document category by id' })
  findOne(@Param('id') id: string) {
    return this.documentCategoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a document category by id' })
  update(
    @Param('id') id: string,
    @Body() updateDocumentCategoryDto: UpdateDocumentCategoryDto,
  ) {
    return this.documentCategoriesService.update(id, updateDocumentCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document category by id' })
  remove(@Param('id') id: string) {
    return this.documentCategoriesService.remove(id);
  }
}
