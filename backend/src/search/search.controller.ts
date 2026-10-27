import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { Need } from 'src/auth/need.decorator';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Need('house.view')
  search(@Query('q') q?: string) {
    return this.searchService.search(q);
  }
}
