import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findByEmail(email: string) {
    // Gọi repository để tìm user
    return await this.usersRepository.findByEmail(email);
  }

  async findById(id: string) {
    return await this.usersRepository.findById(id);
  }

  async create(userData: any) {
    return await this.usersRepository.create(userData);
  }
}
