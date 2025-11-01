import {setCookie, getCookie} from 'hono/cookie';
import {auth0Service} from '../servicies/auth0Service';
import {createMiddleware} from 'hono/factory';
import {UserInfo} from '../types';
import {redirectToWithEncoding} from "../helpers/redirectToWithEncoding";

export const authMiddleware = createMiddleware<{
  Variables: {
    user: UserInfo;
    accessToken: string;
    tokenRefreshed?: boolean;
    expiresAt: number;
  }
}>(async (c, next) => {
  const accessToken = getCookie(c, 'access_token');
  const refreshToken = getCookie(c, 'refresh_token');
  const expiresAt = getCookie(c, 'expires_at');

  if (!accessToken || !expiresAt) {
    return redirectToWithEncoding(
      c,
      'No valid session found. Please log in again.',
      '/'
    )
  }


  const expiresAtNum = parseInt(expiresAt, 10);

  // Check if token is expiring soon and refresh if needed
  if (refreshToken && auth0Service.isTokenExpiringSoon(expiresAtNum)) {
    try {
      const newTokens = await auth0Service.refreshToken(refreshToken);
      const newExpiresAt = Date.now() + newTokens.expires_in * 1000;

      // Update cookies with new tokens
      setCookie(c, 'access_token', newTokens.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: newTokens.expires_in,
      });

      if (newTokens.refresh_token) {
        setCookie(c, 'refresh_token', newTokens.refresh_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'Strict',
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });
      }

      setCookie(c, 'expires_at', newExpiresAt.toString(), {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: newTokens.expires_in,
      });

      c.set('accessToken', newTokens.access_token);
      c.set('tokenRefreshed', true);
    } catch (error) {
      return c.json({error: 'Token refresh failed', message: error.message}, 401);
    }
  } else {
    c.set('accessToken', accessToken);
  }

  // Verify token is still valid
  try {
    const userInfo = await auth0Service.getUserInfo(c.get('accessToken'));
    c.set('user', userInfo);
    c.set('expiresAt', expiresAt);
    await next();
  } catch (error) {
    return redirectToWithEncoding(c, `Invalid Token: ${error?.message}`);
  }
});
