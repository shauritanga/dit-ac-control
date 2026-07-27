import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role, email: user.email });
    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    };
  }

  async me(id: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
}
