import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchDocumentDto } from './dto/search-document.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('documents')
  @ApiOperation({ summary: 'Search public documents' })
  @ApiResponse({ status: 200, description: 'Matching public documents' })
  async publicSearch(@Query() query: SearchDocumentDto) {
    return await this.searchService.searchDocuments(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('documents/private')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search documents visible to current user' })
  @ApiResponse({ status: 200, description: 'Matching authorized documents' })
  async privateSearch(
    @Query() query: SearchDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.searchService.searchDocuments(query, user);
  }
}
