import {Hono} from 'hono';
import {setCookie, getCookie, deleteCookie} from 'hono/cookie';
import {auth0Service} from '../servicies/auth0Service';
import {authMiddleware} from '../middlewares/authMiddleware';
import {redirectToWithEncoding} from "../helpers/redirectToWithEncoding";

export const authRouter = new Hono();


authRouter.post('/login', async (c) => {
  try {
    const formData = await c.req.formData();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();

    if (!email || !password) {
      return c.json({
        error: 'Validation Error',
        message: 'Email and password are required'
      }, 400);
    }

    // Authenticate user
    const tokens = await auth0Service.loginWithPassword(email, password);


    const userInfo = await auth0Service.getUserInfo(tokens.access_token);
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    console.log('tokens', tokens);

    // Set secure HTTP-only cookies
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

    setCookie(c, 'expires_at', expiresAt.toString(), {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: tokens.expires_in,
    });


    return c.redirect('/dashboard');
  } catch (error) {
    return c.json({
      error: 'Authentication Failed',
      message: error.message
    }, 401);
  }
})

/**
 * POST /auth/signup
 * Create new user account
 */
authRouter.post('/signup', async (c) => {
  try {
    const fomData = await c.req.formData();

    const email = fomData.get('email')?.toString();
    const password = fomData.get('password')?.toString();
    const name = fomData.get('name')?.toString();

    if (!email || !password) {
      return redirectToWithEncoding(c, 'Email and password are required');
    }

    const user = await auth0Service.createUser(email, password, name);

    console.log('User created:', user);

    return redirectToWithEncoding(
      c,
      'Account created successfully. You can now login.',
      '/',
      'success'
    );
  } catch (error) {
    return redirectToWithEncoding(
      c,
      error.message,
      '/',
      'error'
    );
  }
});

/**
 * POST /auth/logout
 * Logout user and clear session
 */
authRouter.post('/logout', (c) => {
  deleteCookie(c, 'access_token');
  deleteCookie(c, 'refresh_token');
  deleteCookie(c, 'expires_at');

  return c.redirect('/');
});

/**
 * POST /auth/refresh
 * Manually refresh access token
 */
authRouter.get('/refresh', async (c) => {
  try {
    const refreshToken = getCookie(c, 'refresh_token');
    const referer = c.req.header('Referer')

    if (!refreshToken) {
      return redirectToWithEncoding(
        c,
        `Missing refresh token`,
        '/',
        'error'
      );
    }

    const tokens = await auth0Service.refreshToken(refreshToken);

    console.log('new tokens', tokens);

    const expiresAt = Date.now() + tokens.expires_in * 1000;

    setCookie(c, 'access_token', tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: tokens.expires_in,
    });


    if (tokens.refresh_token) {
      setCookie(c, 'refresh_token', tokens.id_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: tokens.expires_in,
      });
    }

    setCookie(c, 'expires_at', expiresAt.toString(), {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: tokens.expires_in,
    });


    return c.redirect(referer);
  } catch (error) {
    // Error case
    return redirectToWithEncoding(
      c,
      error.message,
      '/',
      'error'
    );
  }
});

/**
 * GET /auth/status
 * Check authentication status (Public)
 */
authRouter.get('/status', async (c) => {
  const accessToken = getCookie(c, 'access_token');
  const expiresAt = getCookie(c, 'expires_at');

  if (!accessToken || !expiresAt) {
    return c.json({authenticated: false});
  }

  const expiresAtNum = parseInt(expiresAt, 10);
  const isExpired = auth0Service.isTokenExpired(expiresAtNum);

  return c.json({
    authenticated: !isExpired,
    expiresAt: expiresAtNum,
    isExpired,
    isExpiringSoon: auth0Service.isTokenExpiringSoon(expiresAtNum),
  });
});
