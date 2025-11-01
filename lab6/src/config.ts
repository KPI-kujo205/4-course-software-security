import {Auth0Config} from './types';

export const auth0Config: Auth0Config = {
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  audience: process.env.AUTH0_AUDIENCE!,
  loginRedirectUri: 'http://localhost:3000/auth/login/callback',
  logoutRedirectUri: 'http://localhost:3000/',
};
