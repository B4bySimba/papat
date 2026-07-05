import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { DatabaseService } from 'src/database/database.service';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly databaseService: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req.cookies?.token;
        },
      ]),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { sub: string }) {
    const user = await this.databaseService.user.findUnique({
      where: { id: parseInt(payload.sub) },
      include: { permissions: true }, // Include permissions
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      permissions: user.permissions.map((p) => p.name), // Include permission names
    };
  }
}
