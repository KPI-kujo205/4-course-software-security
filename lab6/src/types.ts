export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
  loginRedirectUri: string;
  logoutRedirectUri: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

export interface UserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export interface AuthContext {
  user: UserInfo;
  accessToken: string;
  expiresAt: number;
}
