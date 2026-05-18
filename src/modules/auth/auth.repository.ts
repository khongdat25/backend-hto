import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ObjectId } from 'mongodb';

@Injectable()
export class AuthRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  private get tokenCollection() {
    return this.databaseService.collection('password_reset_tokens');
  }

  async deleteTokensByEmail(email: string) {
    return await this.tokenCollection.deleteMany({ email });
  }

  async createToken(userId: string, email: string, token: string, expiresAt: Date) {
    return await this.tokenCollection.insertOne({
      userId: new ObjectId(userId),
      email,
      token,
      expiresAt,
      createdAt: new Date(),
    });
  }

  async findToken(token: string) {
    return await this.tokenCollection.findOne({ token });
  }

  async deleteToken(token: string) {
    return await this.tokenCollection.deleteOne({ token });
  }
}
