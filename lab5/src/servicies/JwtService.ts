import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto';
import {auth0Config} from '@/config'

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import * as jose from 'jose';


const client = jwksClient({
  jwksUri: `https://${auth0Config.domain}/.well-known/jwks.json`,
});

class JwtService {
  private privateKey: string;

  constructor() {
    this.loadPrivateKey();
  }

  private async loadPrivateKey() {
    try {
      const privateKeyPath = path.resolve(__dirname, '../../certs/jwe.pem');
      const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf-8');
      this.privateKey = privateKeyPem;
    } catch (error) {
      console.error('Failed to load private key:', error);
      throw new Error('Private key could not be loaded');
    }
  }


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


  async decodeJWEToken(encodedToken: string) {
    console.log('encodedToken', encodedToken)

    const privateKey = crypto.createPrivateKey(this.privateKey)
    const {plaintext} = await jose.compactDecrypt(encodedToken, privateKey)

    const decodedString = await (new TextDecoder().decode(plaintext));

    return decodedString
  }
}

export const jwtService = new JwtService();
