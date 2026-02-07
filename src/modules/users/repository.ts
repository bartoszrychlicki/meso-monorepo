import { User } from '@/types/user';
import { createRepository } from '@/lib/data/repository-factory';

const repo = createRepository<User>('users');

export const usersRepository = {
  ...repo,

  async findByEmail(email: string): Promise<User | null> {
    const users = await repo.findMany((u) => u.email === email && u.is_active);
    return users[0] ?? null;
  },

  async findByPin(employeeCode: string, pin: string): Promise<User | null> {
    // Match by pin - in this prototype, employee_code maps to username
    const users = await repo.findMany(
      (u) => u.pin === pin && u.is_active
    );
    return users[0] ?? null;
  },

  async authenticateUser(email: string): Promise<User | null> {
    // Prototype: any password works, just check email exists
    return this.findByEmail(email);
  },
};
