import {auth0Config} from '@/config';
import {type Auth0Config, TokenResponse} from "@/types";
import {Context} from "hono";
import {setCookie} from "hono/cookie";

class Auth0Service {
  private config: Auth0Config;

  constructor(config: Auth0Config) {
    this.config = config;
  }

  buildLoginWithSSOUrl() {
    return `https://${this.config.domain}/authorize?` +
      new URLSearchParams(
        {
          response_type: 'code',
          client_id: this.config.clientId,
          redirect_uri: this.config.loginRedirectUri,
          scope: 'openid email profile offline_access',
          audience: this.config.audience,
        }
      ).toString();
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const response = await fetch(`https://${this.config.domain}/oauth/token`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.loginRedirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Token exchange failed');
    }

    return response.json();
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

    console.log('response', response)

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Authentication failed');
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

  async getUserInfo(accessToken: string) {
    try {
      const response = await fetch(`https://${this.config.domain}/userinfo`, {
        headers: {Authorization: `Bearer ${accessToken}`},
      });

      if (!response.ok) {
        const resp = await response.text()
        throw new Error(`Error fetching user info: ${response.status} - ${JSON.stringify(resp)}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
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
        audience: this.config.audience,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(error);
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

  setCookies(c: Context, tokens: TokenResponse) {

    // Update cookies with new tokens
    setCookie(c, 'access_token', tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: tokens.expires_in,
    });

    if (tokens.refresh_token) {
      setCookie(c, 'refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    const newExpiresAt = Date.now() + tokens.expires_in * 1000;

    setCookie(c, 'expires_at', newExpiresAt.toString(), {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: tokens.expires_in,
    });
  }


  buildLogoutUrl() {
    const logoutUrl = `https://${this.config.domain}/v2/logout?` +
      new URLSearchParams({
        client_id: this.config.clientId,
        returnTo: this.config.logoutRedirectUri,
      }).toString();


    return logoutUrl
  }
}

export const auth0Service = new Auth0Service(auth0Config);
