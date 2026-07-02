import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository.js';
import { env } from '../config/env.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';

const userRepository = new UserRepository();

export class AuthService {
  async register(data: { email: string; password: string; firstName?: string; lastName?: string }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new BadRequestError('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const { password, ...userData } = data;
    const user = await userRepository.create({
      ...userData,
      passwordHash,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Extract roles and permissions
    const roles = user.userRoles.map((ur: any) => ur.role.name);
    const permissions: string[] = [];
    user.userRoles.forEach((ur: any) => {
      ur.role.rolePermissions.forEach((rp: any) => {
        if (!permissions.includes(rp.permission.name)) {
          permissions.push(rp.permission.name);
        }
      });
    });

    const tokens = this.generateTokens({
      id: user.id,
      email: user.email,
      roles,
      permissions,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        permissions,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        id: string;
        email: string;
        roles: string[];
        permissions: string[];
      };

      const user = await userRepository.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or suspended');
      }

      // Re-fetch roles and permissions
      const dbUser = await userRepository.findByEmail(user.email);
      const roles = dbUser?.userRoles.map((ur: any) => ur.role.name) || [];
      const permissions: string[] = [];
      dbUser?.userRoles.forEach((ur: any) => {
        ur.role.rolePermissions.forEach((rp: any) => {
          if (!permissions.includes(rp.permission.name)) {
            permissions.push(rp.permission.name);
          }
        });
      });

      const tokens = this.generateTokens({
        id: user.id,
        email: user.email,
        roles,
        permissions,
      });

      return tokens;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  private generateTokens(payload: { id: string; email: string; roles: string[]; permissions: string[] }) {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '15m',
    });
    const refreshToken = jwt.sign({ id: payload.id, email: payload.email }, env.JWT_REFRESH_SECRET, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

export default AuthService;
