import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../../../common/interfaces/authenticated-user.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.jwtSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);

    if (!user?._id || user.status !== 'active') {
      throw new UnauthorizedException(
        'Nguoi dung khong hop le hoac da bi khoa',
      );
    }

    return {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      roleId: user.roleId.toString(),
      departmentId: user.departmentId?.toString() ?? null,
      status: user.status,
    };
  }
}
