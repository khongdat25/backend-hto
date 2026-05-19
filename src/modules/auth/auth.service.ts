import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../../common/interfaces/authenticated-user.interface';
import { ROLE_IDS } from '../../common/constants/role.constants';
import {
  MongoId,
  UserDocument,
} from '../users/interfaces/user-document.interface';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { AuthRepository } from './auth.repository';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const PASSWORD_RESET_RESPONSE = {
  message:
    'Neu email ton tai trong he thong, lien ket dat lai mat khau da duoc gui.',
};
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthenticatedUser> {
    const { email, password, fullName } = registerDto;
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email da duoc su dung');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await this.usersService.create({
      fullName,
      email,
      passwordHash,
      roleId: ROLE_IDS.USER,
    });

    return this.toAuthenticatedUser(newUser);
  }

  async validateUser(loginDto: LoginDto): Promise<AuthenticatedUser> {
    const { email, password } = loginDto;
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Email hoac mat khau khong chinh xac');
    }

    const isPasswordMatching = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!isPasswordMatching) {
      throw new UnauthorizedException('Email hoac mat khau khong chinh xac');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Tai khoan da bi khoa');
    }

    return this.toAuthenticatedUser(user);
  }

  async login(user: AuthenticatedUser) {
    return await this.issueTokens(user);
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const tokenHash = hashToken(refreshTokenDto.refreshToken);
    const storedToken =
      await this.authRepository.findActiveRefreshToken(tokenHash);

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token khong hop le');
    }

    if (new Date() > storedToken.expiresAt) {
      await this.authRepository.revokeRefreshToken(tokenHash);
      throw new UnauthorizedException('Refresh token da het han');
    }

    const user = await this.usersService.findById(
      storedToken.userId.toString(),
    );

    if (!user || user.status !== 'active') {
      await this.authRepository.revokeRefreshToken(tokenHash);
      throw new UnauthorizedException('Nguoi dung khong hop le');
    }

    await this.authRepository.revokeRefreshToken(tokenHash);

    return await this.issueTokens(this.toAuthenticatedUser(user));
  }

  async logout(refreshTokenDto: RefreshTokenDto) {
    await this.authRepository.revokeRefreshToken(
      hashToken(refreshTokenDto.refreshToken),
    );

    return { message: 'Dang xuat thanh cong' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return PASSWORD_RESET_RESPONSE;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    const userId = stringifyMongoId(user._id);

    if (!userId) {
      return PASSWORD_RESET_RESPONSE;
    }

    await this.authRepository.deletePasswordResetTokensByEmail(email);
    await this.authRepository.createPasswordResetToken(
      userId,
      email,
      tokenHash,
      expiresAt,
    );

    const frontendUrl = this.configService.get<string>(
      'mail.frontendUrl',
      'http://localhost:3000',
    );
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    await this.mailService.sendPasswordResetEmail(email, resetLink);

    return PASSWORD_RESET_RESPONSE;
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;
    const tokenHash = hashToken(token);
    const tokenDoc =
      await this.authRepository.findPasswordResetToken(tokenHash);

    if (!tokenDoc) {
      throw new UnauthorizedException(
        'Token khong hop le hoac da duoc su dung',
      );
    }

    if (new Date() > tokenDoc.expiresAt) {
      await this.authRepository.deletePasswordResetToken(tokenHash);
      throw new UnauthorizedException('Token da het han');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const updateResult = await this.usersService.updatePassword(
      tokenDoc.userId.toString(),
      passwordHash,
    );

    await this.authRepository.deletePasswordResetToken(tokenHash);
    await this.authRepository.revokeRefreshTokensByUserId(
      tokenDoc.userId.toString(),
    );

    if (updateResult.matchedCount === 0) {
      throw new UnauthorizedException('Nguoi dung khong hop le');
    }

    return { message: 'Mat khau da duoc dat lai thanh cong' };
  }

  private async issueTokens(user: AuthenticatedUser) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      departmentId: user.departmentId,
    };
    const refreshToken = randomBytes(64).toString('hex');
    const refreshTokenExpiresAt = new Date(
      Date.now() + this.getRefreshTokenTtlMs(),
    );

    await this.authRepository.createRefreshToken(
      user.id,
      hashToken(refreshToken),
      refreshTokenExpiresAt,
    );

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
      user,
    };
  }

  private getRefreshTokenTtlMs(): number {
    const configuredTtl = this.configService.get<string>(
      'auth.jwtRefreshExpiresIn',
    );

    return parseDurationMs(configuredTtl) ?? DEFAULT_REFRESH_TOKEN_TTL_MS;
  }

  private toAuthenticatedUser(user: UserDocument): AuthenticatedUser {
    const id = stringifyMongoId(user._id);
    const roleId = stringifyMongoId(user.roleId);

    if (!id || !roleId) {
      throw new UnauthorizedException('Cau truc user khong hop le');
    }

    return {
      id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      roleId,
      departmentId: stringifyMongoId(user.departmentId),
      status: user.status,
    };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function stringifyMongoId(value?: MongoId | null): string | null {
  if (!value) {
    return null;
  }

  return value.toString();
}

function parseDurationMs(value?: string): number | null {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^(\d+)([smhd])?$/i);

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() ?? 's';
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}
