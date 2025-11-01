import {auth0Config} from '@/config'

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';


const client = jwksClient({
  jwksUri: `https://${auth0Config.domain}/.well-known/jwks.json`,
});

class JwtService {
  async verifyJWT(decodedJWTToken: string) {
    return new Promise((resolve, reject) => {
      jwt.verify(
        decodedJWTToken,
        this.getKey,
        {
          issuer: `https://${auth0Config.domain}/`,
          audience: auth0Config.audience,
        },
        (err, decoded) => {
          if (err) {
            return reject(new Error('Invalid JWT token'));
          }
          resolve(decoded);
        }
      );
    });
  }

  getKey(header: any, callback: any) {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        return callback(err);
      }
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    });
  }
}

export const jwtService = new JwtService();
