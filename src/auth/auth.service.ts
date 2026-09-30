import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { UserRow } from '../users/users.repository';
import { toPublicUser, UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokensRepository } from './refresh-tokens.repository';

interface RefreshPayload {
  sub: string;
  jti: string;
}

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findByPhone(dto.phone);
    if (existing) throw new ConflictException('Phone already exists');

    const id = randomUUID();
    const passwordHash = await hash(dto.password, 10);
    await this.users.createUser({
      id,
      phone: dto.phone,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const created = await this.users.findById(id);
    return toPublicUser(created as UserRow);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByPhone(dto.phone);
    const valid = user && (await compare(dto.password, user.password_hash));
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid phone or password');
    }
    if (user.status !== 'active') {
      throw new ForbiddenException('Account is not active');
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefresh(refreshToken);
    const row = await this.refreshTokens.findById(payload.jti);

    if (
      !row ||
      row.revoked_at ||
      row.user_id !== payload.sub ||
      row.token_hash !== sha256(refreshToken) ||
      new Date(row.expires_at) < new Date()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.refreshTokens.revoke(row.id);

    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.issueTokens(user);
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.verifyRefresh(refreshToken);
      await this.refreshTokens.revoke(payload.jti);
    } catch {
      // Already invalid or expired: nothing to revoke
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const matches = await compare(dto.currentPassword, user.password_hash);
    if (!matches)
      throw new BadRequestException('Current password is incorrect');

    await this.users.setPassword(userId, await hash(dto.newPassword, 10));
    await this.refreshTokens.revokeAllForUser(userId);
  }

  private async verifyRefresh(token: string): Promise<RefreshPayload> {
    try {
      return await this.jwt.verifyAsync<RefreshPayload>(token, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async issueTokens(user: UserRow) {
    const accessTtl = Number(this.config.get('JWT_ACCESS_EXPIRES_IN') ?? 900);
    const refreshTtl = Number(
      this.config.get('JWT_REFRESH_EXPIRES_IN') ?? 604800,
    );

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, phone: user.phone },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl,
      },
    );

    const tokenId = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: tokenId },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl,
      },
    );

    await this.refreshTokens.create({
      id: tokenId,
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtl * 1000),
    });

    return { accessToken, refreshToken, expiresIn: accessTtl };
  }
}
