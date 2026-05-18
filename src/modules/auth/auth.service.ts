import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ROLE_IDS } from '../../common/constants/role.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, fullName } = registerDto;

    // Kiểm tra email tồn tại
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new UnauthorizedException('Email đã được sử dụng');
    }

    // Hash mật khẩu
    const saltOrRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltOrRounds);

    // Tạo user mới với dữ liệu chuẩn Prisma
    const newUser = await this.usersService.create({
      fullName,
      email,
      passwordHash,
      roleId: ROLE_IDS.USER,
    });

    // Bỏ passwordHash trước khi trả về
    const { passwordHash: _ph, ...result } = newUser;
    return result;
  }

  async validateUser(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;

    // 1. Tìm user theo email
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // 2. Kiểm tra mật khẩu (Sử dụng trường "passwordHash" từ DB)
    const dbPassword = user.passwordHash;
    if (!dbPassword) {
      throw new UnauthorizedException(
        'Cấu trúc dữ liệu người dùng không hợp lệ',
      );
    }

    // So sánh mật khẩu
    const isPasswordMatching = await bcrypt.compare(password, dbPassword);

    if (!isPasswordMatching) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // 3. Kiểm tra trạng thái user
    if (user.status && user.status !== 'active') {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa');
    }

    // Trả về user (loại bỏ mật khẩu để bảo mật)
    const { passwordHash: _ph, ...result } = user;
    return result;
  }

  async login(user: any) {
    const userId = user._id?.toString();
    if (!userId) {
      throw new UnauthorizedException(
        'Cấu trúc dữ liệu người dùng không hợp lệ',
      );
    }

    const payload = {
      sub: userId,
      email: user.email,
      roleId: user.roleId,
      departmentId: user.departmentId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('auth.jwtRefreshSecret'),
        expiresIn: this.configService.get<string>('auth.jwtRefreshExpiresIn') as any,
      }),
      user: {
        id: userId,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        roleId: user.roleId,
        departmentId: user.departmentId,
      },
    };
  }
}
