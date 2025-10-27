import {Context} from "hono";

export function redirectToWithEncoding(c: Context, errorMessage: string, destination: string = '/', style: 'success' | 'error' = 'error') {
  const encodedMessage = encodeURIComponent(errorMessage);
  return c.redirect(`/redirect?message=${encodedMessage}&style=${style}&destination=${encodeURIComponent(destination)}`);
}

