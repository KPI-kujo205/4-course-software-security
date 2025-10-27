import {Hono} from 'hono';
import {getCookie, deleteCookie} from 'hono/cookie';
import {auth0Service} from '@/servicies/auth0Service';
import {redirectToWithEncoding} from "@/helpers/redirectToWithEncoding";

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

    auth0Service.setCookies(
      c,
      tokens
    )

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

    await auth0Service.createUser(email, password, name);

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

    console.log('Tokens refreshed manually', tokens);

    auth0Service.setCookies(
      c,
      tokens
    )

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

