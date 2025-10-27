import {getCookie} from 'hono/cookie';

import {auth0Service} from '@/servicies/auth0Service';
import {createMiddleware} from 'hono/factory';
import {redirectToWithEncoding} from "@/helpers/redirectToWithEncoding";
import {jwtService} from '@/servicies/JwtService';
import {Context} from "hono";

export const authMiddleware = createMiddleware<{
  Variables: {
    access_token_decoded: string;
  }
}>(async (c, next) => {
  try {
    const {jweAccessToken, refreshToken, expiresAt} = getSessionCookies(c);

    if (!jweAccessToken || !expiresAt) {
      return redirectToWithEncoding(c, 'No valid session found. Please log in again.', '/');
    }

    const accessToken = await jwtService.decodeJWEToken(jweAccessToken);
    const expiresAtNum = parseInt(expiresAt, 10);

    if (refreshToken && auth0Service.isTokenExpiringSoon(expiresAtNum)) {
      await refreshTokens(c, refreshToken);
    }

    await jwtService.verifyJWT(accessToken);

    c.set('access_token_decoded', accessToken);
    await next();
  } catch (error) {
    return redirectToWithEncoding(c, `Authentication Error: ${error?.message || 'Unknown error'}`, '/');
  }
});

// Helper function to get session cookies
function getSessionCookies(c: any) {
  return {
    jweAccessToken: getCookie(c, 'access_token'),
    refreshToken: getCookie(c, 'refresh_token'),
    expiresAt: getCookie(c, 'expires_at'),
  };
}

async function refreshTokens(c: Context, refreshToken: string) {
  try {
    const newTokens = await auth0Service.refreshToken(refreshToken);
    auth0Service.setCookies(c, newTokens);
  } catch (error) {
    throw new Error(`Token refresh failed: ${error?.message || 'Unknown error'}`);
  }
}
