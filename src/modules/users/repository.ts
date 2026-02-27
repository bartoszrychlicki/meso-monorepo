import { User } from '@/types/user';
import { createRepository } from '@/lib/data/repository-factory';

const repo = createRepository<User>('users');

export const usersRepository = {
  ...repo,

  async findByEmail(email: string): Promise<User | null> {
    const users = await repo.findMany((u) => u.email === email && u.is_active);
    return users[0] ?? null;
  },
};
