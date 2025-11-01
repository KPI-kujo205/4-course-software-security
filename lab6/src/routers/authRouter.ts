import {Hono} from 'hono';
import {getCookie, deleteCookie} from 'hono/cookie';
import {auth0Service} from '@/servicies/auth0Service';
import {redirectToWithEncoding} from "@/helpers/redirectToWithEncoding";

export const authRouter = new Hono();


authRouter.post('/login', async (c) => {
  const uri = auth0Service.buildLoginWithSSOUrl()

  return c.redirect(uri);
})


authRouter.get('/login/callback', async (c) => {
    const code = c.req.query('code');

    if (!code) {
      return redirectToWithEncoding(c, 'No code provided');
    }

    try {
      const tokens = await auth0Service.exchangeCodeForTokens(code);


      auth0Service.setCookies(
        c,
        tokens
      )


      return redirectToWithEncoding(
        c,
        'Login successful',
        '/dashboard',
        'success'
      );
    } catch (error) {
      return redirectToWithEncoding(
        c,
        error.message,
      );
    }
  }
)


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
  const url = auth0Service.buildLogoutUrl();

  deleteCookie(c, 'access_token');
  deleteCookie(c, 'refresh_token');
  deleteCookie(c, 'expires_at');

  return c.redirect(url);
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

