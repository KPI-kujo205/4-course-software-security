import {auth0Config} from '../config';
import {type Auth0Config, TokenResponse, UserInfo} from "../types";
import {contextStorage} from "hono/dist/types/middleware/context-storage";

class Auth0Service {
  private config: Auth0Config;

  constructor(config: Auth0Config) {
    this.config = config;
  }

  async loginWithPassword(username: string, password: string): Promise<TokenResponse> {
    const response = await fetch(`https://${this.config.domain}/oauth/token`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        grant_type: 'password',
        username,
        password,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        audience: this.config.audience,
        scope: 'openid profile email offline_access',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.log(error)
      throw new Error(error.message || 'Authentication failed');
    }

    return response.json();
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(`https://${this.config.domain}/oauth/token`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Token refresh failed');
    }

    return response.json();
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(`https://${this.config.domain}/userinfo`, {
      headers: {Authorization: `Bearer ${accessToken}`},
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return response.json();
  }

  async createUser(email: string, password: string, name?: string): Promise<any> {
    const response = await fetch(`https://${this.config.domain}/dbconnections/signup`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        client_id: this.config.clientId,
        email,
        password,
        connection: 'Username-Password-Authentication',
        name: name || email.split('@')[0],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'User creation failed');
    }

    return response.json();
  }

  isTokenExpiringSoon(expiresAt: number): boolean {
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    // Refresh if token expires in less than 5 minutes
    return timeUntilExpiry < 5 * 60 * 1000;
  }

  isTokenExpired(expiresAt: number): boolean {
    return Date.now() >= expiresAt;
  }
}

export const auth0Service = new Auth0Service(auth0Config);
