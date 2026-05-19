import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  CreateUserInput,
  UserDocument,
} from './interfaces/user-document.interface';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return await this.usersRepository.findByEmail(email);
  }

  async findById(id: string): Promise<UserDocument | null> {
    return await this.usersRepository.findById(id);
  }

  async create(userData: CreateUserInput): Promise<UserDocument> {
    return await this.usersRepository.create(userData);
  }

  async updatePassword(userId: string, passwordHash: string) {
    return await this.usersRepository.updatePassword(userId, passwordHash);
  }

  async findAll(query: QueryUsersDto): Promise<Partial<UserDocument>[]> {
    const users = await this.usersRepository.findAll(query);
    return users.map((user) => this.sanitizeUser(user));
  }

  async findOne(id: string): Promise<Partial<UserDocument>> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return this.sanitizeUser(user);
  }

  async createByAdmin(dto: CreateUserDto): Promise<Partial<UserDocument>> {
    const existedUser = await this.usersRepository.findByEmail(dto.email);

    if (existedUser) {
      throw new ConflictException('Email đã tồn tại');
    }

    const isRoleValid = await this.usersRepository.roleExists(dto.roleId);

    if (!isRoleValid) {
      throw new BadRequestException('Role không tồn tại hoặc đã bị khóa');
    }

    if (dto.departmentId) {
      const isDepartmentValid = await this.usersRepository.departmentExists(
        dto.departmentId,
      );

      if (!isDepartmentValid) {
        throw new BadRequestException(
          'Phòng ban không tồn tại hoặc đã bị khóa',
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
      roleId: dto.roleId,
      departmentId: dto.departmentId || null,
      status: dto.status || 'active',
      avatarUrl: dto.avatarUrl || null,
      phone: dto.phone || null,
    });

    return this.sanitizeUser(user);
  }

  async updateById(
    id: string,
    dto: UpdateUserDto,
  ): Promise<Partial<UserDocument>> {
    const currentUser = await this.usersRepository.findById(id);

    if (!currentUser) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (dto.email && dto.email !== currentUser.email) {
      const existedUser = await this.usersRepository.findByEmail(dto.email);

      if (existedUser) {
        throw new ConflictException('Email đã tồn tại');
      }
    }

    if (dto.roleId) {
      const isRoleValid = await this.usersRepository.roleExists(dto.roleId);

      if (!isRoleValid) {
        throw new BadRequestException('Role không tồn tại hoặc đã bị khóa');
      }
    }

    if (dto.departmentId) {
      const isDepartmentValid = await this.usersRepository.departmentExists(
        dto.departmentId,
      );

      if (!isDepartmentValid) {
        throw new BadRequestException(
          'Phòng ban không tồn tại hoặc đã bị khóa',
        );
      }
    }

    const updatedUser = await this.usersRepository.updateById(id, {
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      avatarUrl: dto.avatarUrl,
      roleId: dto.roleId,
      departmentId: dto.departmentId ?? undefined,
      status: dto.status,
    });

    if (!updatedUser) {
      throw new BadRequestException('Cập nhật người dùng thất bại');
    }

    return this.sanitizeUser(updatedUser);
  }

  async updateStatusById(
    id: string,
    dto: UpdateUserStatusDto,
  ): Promise<Partial<UserDocument>> {
    const currentUser = await this.usersRepository.findById(id);

    if (!currentUser) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const updatedUser = await this.usersRepository.updateStatusById(
      id,
      dto.status,
    );

    if (!updatedUser) {
      throw new BadRequestException('Cập nhật trạng thái thất bại');
    }

    return this.sanitizeUser(updatedUser);
  }

  async softDeleteById(id: string): Promise<{ message: string }> {
    const currentUser = await this.usersRepository.findById(id);

    if (!currentUser) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const isDeleted = await this.usersRepository.softDeleteById(id);

    if (!isDeleted) {
      throw new BadRequestException('Xóa người dùng thất bại');
    }

    return { message: 'Xóa người dùng thành công' };
  }

  private sanitizeUser(user: UserDocument): Partial<UserDocument> {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}