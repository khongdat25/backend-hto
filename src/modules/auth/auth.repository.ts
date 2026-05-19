import { Injectable, OnModuleInit } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { DatabaseService } from '../../database/database.service';
import {
  PasswordResetTokenDocument,
  RefreshTokenDocument,
} from './interfaces/auth-token-document.interface';

@Injectable()
export class AuthRepository implements OnModuleInit {
  constructor(private readonly databaseService: DatabaseService) {}

  private get passwordResetTokenCollection() {
    return this.databaseService.collection<PasswordResetTokenDocument>(
      'password_reset_tokens',
    );
  }

  private get refreshTokenCollection() {
    return this.databaseService.collection<RefreshTokenDocument>(
      'refresh_tokens',
    );
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([
      this.passwordResetTokenCollection.createIndex(
        { tokenHash: 1 },
        {
          name: 'uniq_password_reset_token_hash',
          unique: true,
          partialFilterExpression: { tokenHash: { $type: 'string' } },
        },
      ),
      this.passwordResetTokenCollection.createIndex(
        { expiresAt: 1 },
        { name: 'ttl_password_reset_token_expires_at', expireAfterSeconds: 0 },
      ),
      this.refreshTokenCollection.createIndex(
        { tokenHash: 1 },
        {
          name: 'uniq_refresh_token_hash',
          unique: true,
          partialFilterExpression: { tokenHash: { $type: 'string' } },
        },
      ),
      this.refreshTokenCollection.createIndex(
        { userId: 1, revokedAt: 1 },
        { name: 'idx_refresh_token_user_revoked' },
      ),
      this.refreshTokenCollection.createIndex(
        { expiresAt: 1 },
        { name: 'ttl_refresh_token_expires_at', expireAfterSeconds: 0 },
      ),
    ]);
  }

  async deletePasswordResetTokensByEmail(email: string) {
    return await this.passwordResetTokenCollection.deleteMany({ email });
  }

  async createPasswordResetToken(
    userId: string,
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    return await this.passwordResetTokenCollection.insertOne({
      userId: new ObjectId(userId),
      email,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    });
  }

  async findPasswordResetToken(
    tokenHash: string,
  ): Promise<PasswordResetTokenDocument | null> {
    return await this.passwordResetTokenCollection.findOne({ tokenHash });
  }

  async deletePasswordResetToken(tokenHash: string) {
    return await this.passwordResetTokenCollection.deleteOne({ tokenHash });
  }

  async createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return await this.refreshTokenCollection.insertOne({
      userId: new ObjectId(userId),
      tokenHash,
      expiresAt,
      createdAt: new Date(),
      revokedAt: null,
    });
  }

  async findActiveRefreshToken(
    tokenHash: string,
  ): Promise<RefreshTokenDocument | null> {
    return await this.refreshTokenCollection.findOne({
      tokenHash,
      $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }],
    });
  }

  async revokeRefreshToken(tokenHash: string) {
    return await this.refreshTokenCollection.updateOne(
      { tokenHash },
      { $set: { revokedAt: new Date() } },
    );
  }

  async revokeRefreshTokensByUserId(userId: string) {
    return await this.refreshTokenCollection.updateMany(
      {
        userId: new ObjectId(userId),
        $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }],
      },
      { $set: { revokedAt: new Date() } },
    );
  }
}
