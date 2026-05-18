import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.jwtSecret'),
    });
  }

  async validate(payload: any) {
    // Tìm lại user từ database để đảm bảo user vẫn tồn tại và active
    const user = await this.usersService.findById(payload.sub);

    if (!user || (user.status && user.status !== 'active')) {
      throw new UnauthorizedException(
        'Người dùng không hợp lệ hoặc đã bị khóa',
      );
    }

    const { passwordHash: _password, ...safeUser } = user;
    return safeUser;
  }
}
