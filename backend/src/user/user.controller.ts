import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { HashidPipe } from 'src/common/hashid/hashid.pipe';
import { currentAccess } from 'src/auth/access';
import { Need } from 'src/auth/need.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Need('admin')
  @Get()
  list() {
    return this.userService.list();
  }

  @Need('admin')
  @Get('catalog')
  catalog() {
    return this.userService.catalog();
  }

  @Need('admin')
  @Get(':id')
  one(@Param('id', HashidPipe) id: number) {
    return this.userService.one(id);
  }

  @Need('root')
  @Post()
  create(@Body() body: any) {
    return this.userService.create(body);
  }

  @Need('root')
  @Patch(':id')
  update(@Param('id', HashidPipe) id: number, @Body() body: any) {
    return this.userService.update(id, body);
  }

  @Need('root')
  @Put(':id/access')
  setAccess(@Param('id', HashidPipe) id: number, @Body() body: any) {
    return this.userService.setAccess(id, body);
  }

  @Need('admin')
  @Post(':id/reset-password')
  resetPassword(@Param('id', HashidPipe) id: number) {
    return this.userService.resetPassword(currentAccess()!, id);
  }

  @Need('admin')
  @Post(':id/suspend')
  suspend(@Param('id', HashidPipe) id: number, @Body('suspended') suspended: unknown) {
    return this.userService.setSuspended(currentAccess()!, id, suspended);
  }

  @Need('root')
  @Post(':id/unlock')
  unlock(@Param('id', HashidPipe) id: number) {
    return this.userService.unlock(id);
  }
}
