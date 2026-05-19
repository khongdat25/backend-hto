import { Injectable } from '@nestjs/common';
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
}
