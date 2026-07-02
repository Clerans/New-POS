import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { successResponse } from '../utils/response.js';
import { parseUserAgent } from '../utils/userAgentParser.js';

const authService = new AuthService();

function getClientMeta(req: Request) {
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '';
  const userAgent = req.headers['user-agent'];
  const parsed = parseUserAgent(userAgent);
  return {
    ipAddress,
    userAgent,
    ...parsed,
  };
}

export class AuthController {
  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clientMeta = getClientMeta(req);
      const user = await authService.register(req.body, clientMeta);
      res.status(201).json(successResponse('User registered successfully', { user }));
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { emailOrUsername, password } = req.body;
      const clientMeta = getClientMeta(req);
      const result = await authService.login(emailOrUsername, password, clientMeta);
      res.status(200).json(successResponse('Login successful', result));
    } catch (error) {
      next(error);
    }
  };

  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const clientMeta = getClientMeta(req);
      const result = await authService.refresh(refreshToken, clientMeta);
      res.status(200).json(successResponse('Tokens refreshed successfully', result));
    } catch (error) {
      next(error);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const clientMeta = getClientMeta(req);
      await authService.logout(refreshToken, clientMeta);
      res.status(200).json(successResponse('Logout successful', null));
    } catch (error) {
      next(error);
    }
  };

  public forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      const clientMeta = getClientMeta(req);
      const result = await authService.forgotPassword(email, clientMeta);
      res.status(200).json(successResponse(result.message, { devToken: result.devToken }));
    } catch (error) {
      next(error);
    }
  };

  public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, password } = req.body;
      const clientMeta = getClientMeta(req);
      await authService.resetPassword(token, password, clientMeta);
      res.status(200).json(successResponse('Password updated successfully', null));
    } catch (error) {
      next(error);
    }
  };

  public changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;
      const clientMeta = getClientMeta(req);
      await authService.changePassword(userId, currentPassword, newPassword, clientMeta);
      res.status(200).json(successResponse('Password changed successfully. Please log in again.', null));
    } catch (error) {
      next(error);
    }
  };

  public me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      res.status(200).json(successResponse('User profile retrieved', { user }));
    } catch (error) {
      next(error);
    }
  };

  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const clientMeta = getClientMeta(req);
      const updated = await authService.updateProfile(userId, req.body, clientMeta);
      res.status(200).json(successResponse('Profile updated successfully', { user: updated }));
    } catch (error) {
      next(error);
    }
  };

  public getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const sessions = await authService.getActiveSessions(userId);
      res.status(200).json(successResponse('Active sessions retrieved', { sessions }));
    } catch (error) {
      next(error);
    }
  };

  public revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { id: sessionId } = req.params;
      const clientMeta = getClientMeta(req);
      await authService.revokeSession(userId, sessionId, clientMeta);
      res.status(200).json(successResponse('Session revoked successfully', null));
    } catch (error) {
      next(error);
    }
  };

  public logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const clientMeta = getClientMeta(req);
      await authService.logoutAll(userId, clientMeta);
      res.status(200).json(successResponse('Logged out from all sessions', null));
    } catch (error) {
      next(error);
    }
  };

  public getActivityLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const logs = await authService.getActivityLogs(userId);
      res.status(200).json(successResponse('Activity logs retrieved', { logs }));
    } catch (error) {
      next(error);
    }
  };
}

export default AuthController;
