import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRow, UsersRepository } from './users.repository';

export function toPublicUser(u: UserRow) {
  return {
    id: u.id,
    phone: u.phone,
    firstName: u.first_name,
    lastName: u.last_name,
    status: u.status,
    createdAt: u.created_at,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  createUser(u: {
    id: string;
    phone: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }) {
    return this.repo.create(u);
  }

  findByPhone(phone: string) {
    return this.repo.findByPhone(phone);
  }

  findById(id: string) {
    return this.repo.findById(id);
  }

  setPassword(id: string, passwordHash: string) {
    return this.repo.updatePassword(id, passwordHash);
  }

  async getProfile(id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return toPublicUser(user);
  }

  async updateProfile(id: string, dto: UpdateUserDto) {
    await this.repo.updateProfile(id, dto);
    return this.getProfile(id);
  }

  async deleteAccount(id: string) {
    try {
      await this.repo.delete(id);
    } catch (e: any) {
      if (e?.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException(
          'Delete your projects before deleting your account',
        );
      }
      throw e;
    }
  }
}
