import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MailModule } from '../mail/mail.module';
import { DatabaseModule } from '../../database/database.module';

type JwtExpiresIn = `${number}${'s' | 'm' | 'h' | 'd'}` | number;

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MailModule,
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: getJwtExpiresIn(configService),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

function getJwtExpiresIn(configService: ConfigService): JwtExpiresIn {
  const value = configService.getOrThrow<string>('auth.jwtExpiresIn');

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  return value as JwtExpiresIn;
}
