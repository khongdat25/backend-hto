export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  roleId: string;
  departmentId: string | null;
  status: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  roleId: string;
  departmentId: string | null;
}
