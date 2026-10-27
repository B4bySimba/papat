import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { logAs } from 'src/audit/audit.interceptor';
import { currentAccess } from './access';
import { AuthService, SESSION_HOURS } from './auth.service';
import { Need, Public } from './need.decorator';

const setSession = (res: Response, token: string) =>
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
  });

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: { username?: unknown; password?: unknown }, @Res({ passthrough: true }) res: Response) {
    const { token, mustChangePassword } = await this.authService.login(body?.username, body?.password);
    setSession(res, token);
    return { message: 'Login successful', mustChangePassword };
  }

  @Need('self')
  @Get('me')
  me() {
    return this.authService.me(currentAccess()!);
  }

  @Need('self')
  @Post('password')
  async password(@Body() body: { current?: unknown; next?: unknown }, @Res({ passthrough: true }) res: Response) {
    setSession(res, await this.authService.changePassword(currentAccess()!, body?.current, body?.next));
    return { message: 'Password changed.' };
  }

  @Need('self')
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    logAs('logout');
    res.clearCookie('token', { path: '/' });
    return { message: 'Logged out.' };
  }
}
