import { Request } from 'express';
import { AuthenticatedUser } from './authenticated-user.interface';

export interface RequestWithId extends Request {
  requestId?: string;
  user?: AuthenticatedUser;
}
