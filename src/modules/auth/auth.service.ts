import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuthRepository } from './auth.repository';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ROLE_IDS } from '../../common/constants/role.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
    private readonly mailService: MailService,
  ) { }

  async register(registerDto: RegisterDto) {
    const { email, password, fullName } = registerDto;

    // Kiểm tra email tồn tại
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
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

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // 1. Kiểm tra email có tồn tại trong hệ thống không
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Email không tồn tại trong hệ thống');
    }

    // 2. Tạo token ngẫu nhiên (64 ký tự hex)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // hết hạn sau 15 phút

    // 3. Xóa token cũ (nếu có) và lưu token mới vào DB thông qua Repository
    await this.authRepository.deleteTokensByEmail(email);
    await this.authRepository.createToken(user._id.toString(), email, token, expiresAt);

    // 4. Tạo link reset và gửi email
    const frontendUrl = this.configService.get<string>('mail.frontendUrl');
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    await this.mailService.sendPasswordResetEmail(email, resetLink);

    return { message: 'Email đặt lại mật khẩu đã được gửi, vui lòng kiểm tra hộp thư của bạn' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    // 1. Tìm token thông qua Repository
    const tokenDoc = await this.authRepository.findToken(token);
    if (!tokenDoc) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã được sử dụng');
    }

    // 2. Kiểm tra token chưa hết hạn
    if (new Date() > tokenDoc.expiresAt) {
      await this.authRepository.deleteToken(token);
      throw new UnauthorizedException('Token đã hết hạn, vui lòng yêu cầu đặt lại mật khẩu mới');
    }

    // 3. Hash mật khẩu mới
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Cập nhật mật khẩu cho user
    await this.usersService.updatePassword(tokenDoc.userId.toString(), passwordHash);

    // 5. Xóa token đã dùng thông qua Repository
    await this.authRepository.deleteToken(token);

    return { message: 'Mật khẩu đã được đặt lại thành công' };
  }
}
