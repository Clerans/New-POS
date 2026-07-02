import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRepository } from '../repositories/user.repository.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { env } from '../config/env.js';
import { BadRequestError, UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { ClientMetadata } from '../utils/userAgentParser.js';

const userRepository = new UserRepository();
const sessionRepository = new SessionRepository();

export class AuthService {
  // Validate password strength against policy
  private validatePasswordPolicy(password: string) {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new BadRequestError('Password must be at least 8 characters long');
    }
    if (!hasUppercase) {
      throw new BadRequestError('Password must contain at least one uppercase letter');
    }
    if (!hasLowercase) {
      throw new BadRequestError('Password must contain at least one lowercase letter');
    }
    if (!hasNumber) {
      throw new BadRequestError('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      throw new BadRequestError('Password must contain at least one special character');
    }
  }

  async register(data: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
    branchId?: string;
  }, clientMeta?: ClientMetadata) {
    // Check email
    const existingEmail = await userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new BadRequestError('User with this email already exists');
    }

    // Check username
    const existingUsername = await userRepository.findByUsername(data.username);
    if (existingUsername) {
      throw new BadRequestError('User with this username already exists');
    }

    // Password policy
    this.validatePasswordPolicy(data.password);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const { password, ...userData } = data;
    const user = await userRepository.create({
      ...userData,
      passwordHash,
      status: 'ACTIVE',
    });

    // Logging
    await userRepository.createAuditLog({
      userId: user.id,
      entityName: 'User',
      entityId: user.id,
      action: 'REGISTER',
      newValue: JSON.stringify({ email: user.email, username: user.username }),
      ...clientMeta,
    });

    await userRepository.createActivityLog({
      userId: user.id,
      action: 'REGISTERED',
      details: `User registered with username: ${user.username}`,
      ...clientMeta,
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async login(emailOrUsername: string, password: string, clientMeta?: ClientMetadata) {
    const user = await userRepository.findByEmailOrUsername(emailOrUsername);
    
    if (!user) {
      // Log failed login attempt (unknown user)
      await userRepository.logLoginAttempt({
        email: emailOrUsername,
        status: 'FAILED',
        failReason: 'User not found',
        ...clientMeta,
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check lock status
    if (user.status === 'LOCKED' || user.status === 'SUSPENDED') {
      if (user.lockedUntil && user.lockedUntil < new Date()) {
        // Lock expired, reset failed attempts
        await userRepository.resetFailedAttempts(user.id);
        user.status = 'ACTIVE';
      } else {
        const reason = user.status === 'LOCKED' ? 'Account locked due to multiple failed login attempts' : 'Account suspended';
        await userRepository.logLoginAttempt({
          userId: user.id,
          email: user.email,
          status: 'LOCKED',
          failReason: reason,
          ...clientMeta,
        });
        throw new ForbiddenError(reason);
      }
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('Your account is not active. Status: ' + user.status);
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Increment failed attempts
      const updatedUser = await userRepository.incrementFailedAttempts(user.id, user.failedLoginAttempts);
      const isNowLocked = updatedUser.status === 'LOCKED';
      
      await userRepository.logLoginAttempt({
        userId: user.id,
        email: user.email,
        status: isNowLocked ? 'LOCKED' : 'FAILED',
        failReason: isNowLocked ? 'Account locked' : 'Invalid password',
        ...clientMeta,
      });

      if (isNowLocked) {
        throw new ForbiddenError('Account locked due to too many failed attempts. Try again in 15 minutes.');
      } else {
        throw new UnauthorizedError('Invalid credentials');
      }
    }

    // Login successful - Reset failed attempts
    await userRepository.resetFailedAttempts(user.id);
    await userRepository.update(user.id, { lastLogin: new Date() });

    // Roles and permissions
    const roles = user.userRoles.map((ur: any) => ur.role.name);
    const permissions: string[] = [];
    user.userRoles.forEach((ur: any) => {
      ur.role.rolePermissions.forEach((rp: any) => {
        if (!permissions.includes(rp.permission.name)) {
          permissions.push(rp.permission.name);
        }
      });
    });

    // Tokens
    const { accessToken, refreshToken } = this.generateTokens({
      id: user.id,
      email: user.email,
      roles,
      permissions,
    });

    // Save Session to Database
    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + 7); // 7 days

    await sessionRepository.createSession({
      userId: user.id,
      token: refreshToken,
      expiresAt: refreshExpires,
      ...clientMeta,
    });

    // Logs
    await userRepository.logLoginAttempt({
      userId: user.id,
      email: user.email,
      status: 'SUCCESS',
      ...clientMeta,
    });

    await userRepository.createActivityLog({
      userId: user.id,
      action: 'LOGIN',
      details: 'User logged in successfully',
      ...clientMeta,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        phone: user.phone,
        avatar: user.avatar,
        roles,
        permissions,
        branchId: user.branchId,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string, clientMeta?: ClientMetadata) {
    try {
      // 1. Verify token signature
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        id: string;
        email: string;
      };

      // 2. Fetch session from DB
      const dbSession = await sessionRepository.findSessionByToken(refreshToken);

      // 3. Theft/Reuse Detection
      if (!dbSession) {
        throw new UnauthorizedError('Invalid session');
      }

      if (!dbSession.isValid || dbSession.expiresAt < new Date()) {
        // Token was already invalidated, meaning someone might be reusing it (theft attempt)
        // Revoke all sessions for this user for security
        await sessionRepository.invalidateAllSessionsByUserId(dbSession.userId);
        
        await userRepository.createAuditLog({
          userId: dbSession.userId,
          entityName: 'UserSession',
          entityId: dbSession.id,
          action: 'REVOKE_ALL_SESSIONS',
          oldValue: 'Refresh token reuse detected',
          ...clientMeta,
        });

        throw new UnauthorizedError('Token reuse detected. All sessions revoked.');
      }

      // 4. Invalidate old session (token rotation)
      await sessionRepository.invalidateSessionById(dbSession.id);

      // 5. Check user status
      const user = await userRepository.findByEmail(decoded.email);
      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedError('User account suspended or inactive');
      }

      // Re-compile roles and permissions
      const roles = user.userRoles.map((ur: any) => ur.role.name);
      const permissions: string[] = [];
      user.userRoles.forEach((ur: any) => {
        ur.role.rolePermissions.forEach((rp: any) => {
          if (!permissions.includes(rp.permission.name)) {
            permissions.push(rp.permission.name);
          }
        });
      });

      // 6. Generate new tokens
      const tokens = this.generateTokens({
        id: user.id,
        email: user.email,
        roles,
        permissions,
      });

      // 7. Save new session
      const refreshExpires = new Date();
      refreshExpires.setDate(refreshExpires.getDate() + 7);

      await sessionRepository.createSession({
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: refreshExpires,
        ...clientMeta,
      });

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken: string, clientMeta?: ClientMetadata) {
    const session = await sessionRepository.findSessionByToken(refreshToken);
    if (session) {
      await sessionRepository.invalidateSessionById(session.id);
      
      await userRepository.createActivityLog({
        userId: session.userId,
        action: 'LOGOUT',
        details: 'User logged out',
        ...clientMeta,
      });
    }
  }

  async logoutAll(userId: string, clientMeta?: ClientMetadata) {
    await sessionRepository.invalidateAllSessionsByUserId(userId);
    
    await userRepository.createActivityLog({
      userId,
      action: 'LOGOUT_EVERYWHERE',
      details: 'Logged out of all sessions',
      ...clientMeta,
    });
  }

  async forgotPassword(email: string, clientMeta?: ClientMetadata) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Prevent email enumeration: act as if it succeeded
      return { message: 'If that email is registered, we have sent a recovery token.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    await userRepository.createPasswordResetToken(user.id, resetToken, expiresAt);

    // In dev mode, we print the token to stdout and can return it or log it
    console.log(`[EMAIL SERVICE] Password reset requested for ${email}. Token: ${resetToken}`);
    
    await userRepository.createActivityLog({
      userId: user.id,
      action: 'FORGOT_PASSWORD_REQUEST',
      details: 'Password reset link generated',
      ...clientMeta,
    });

    return { 
      message: 'If that email is registered, we have sent a recovery token.',
      devToken: env.NODE_ENV === 'development' ? resetToken : undefined // Only return token in dev mode
    };
  }

  async resetPassword(token: string, newPassword: string, clientMeta?: ClientMetadata) {
    const resetRecord = await userRepository.findPasswordResetToken(token);

    if (!resetRecord || resetRecord.isUsed || resetRecord.expiresAt < new Date()) {
      throw new BadRequestError('Invalid or expired password reset token');
    }

    // Password policy
    this.validatePasswordPolicy(newPassword);

    // Prevent password reuse
    const isSamePassword = await bcrypt.compare(newPassword, resetRecord.user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestError('New password cannot be the same as your current password');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await userRepository.update(resetRecord.userId, { passwordHash });
    await userRepository.markPasswordResetTokenUsed(token);

    // Invalidate all active sessions for security
    await sessionRepository.invalidateAllSessionsByUserId(resetRecord.userId);

    await userRepository.createAuditLog({
      userId: resetRecord.userId,
      entityName: 'User',
      entityId: resetRecord.userId,
      action: 'RESET_PASSWORD',
      ...clientMeta,
    });

    await userRepository.createActivityLog({
      userId: resetRecord.userId,
      action: 'PASSWORD_RESET_SUCCESS',
      details: 'Password reset via email token',
      ...clientMeta,
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, clientMeta?: ClientMetadata) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify current password
    const dbUser = await userRepository.findByEmail(user.email);
    const isMatch = await bcrypt.compare(currentPassword, dbUser!.passwordHash);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect');
    }

    // Policy check
    this.validatePasswordPolicy(newPassword);

    // Prevent reuse
    const isSamePassword = await bcrypt.compare(newPassword, dbUser!.passwordHash);
    if (isSamePassword) {
      throw new BadRequestError('New password cannot be the same as your current password');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await userRepository.update(userId, { passwordHash });
    await sessionRepository.invalidateAllSessionsByUserId(userId); // Invalidate sessions on password change

    await userRepository.createAuditLog({
      userId,
      entityName: 'User',
      entityId: userId,
      action: 'CHANGE_PASSWORD',
      ...clientMeta,
    });

    await userRepository.createActivityLog({
      userId,
      action: 'PASSWORD_CHANGED',
      details: 'Password changed from profile settings',
      ...clientMeta,
    });
  }

  async updateProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
    avatar?: string;
  }, clientMeta?: ClientMetadata) {
    const originalUser = await userRepository.findById(userId);
    if (!originalUser) {
      throw new UnauthorizedError('User not found');
    }

    const updated = await userRepository.update(userId, {
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: data.displayName,
      phone: data.phone,
      avatar: data.avatar,
    });

    await userRepository.createAuditLog({
      userId,
      entityName: 'User',
      entityId: userId,
      action: 'UPDATE_PROFILE',
      oldValue: JSON.stringify(originalUser),
      newValue: JSON.stringify(updated),
      ...clientMeta,
    });

    await userRepository.createActivityLog({
      userId,
      action: 'UPDATE_PROFILE',
      details: 'User updated profile fields',
      ...clientMeta,
    });

    return updated;
  }

  async getActiveSessions(userId: string) {
    return sessionRepository.findActiveSessionsByUserId(userId);
  }

  async revokeSession(userId: string, sessionId: string, clientMeta?: ClientMetadata) {
    const session = await sessionRepository.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new ForbiddenError('Unauthorized to revoke this session');
    }

    await sessionRepository.invalidateSessionById(sessionId);

    await userRepository.createActivityLog({
      userId,
      action: 'REVOKE_SESSION',
      details: `Revoked session ID: ${sessionId}`,
      ...clientMeta,
    });
  }

  async getActivityLogs(userId: string) {
    return userRepository.getActivityLogs(userId);
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
