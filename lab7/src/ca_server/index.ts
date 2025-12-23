import * as pem from 'pem'
import {assert} from "@/helpers/assert";
import {NodeCert} from "@/node/config";
import {Logger} from "@/logger";

class CertificateAuthorityServer {
  private caCert: string = ''
  private caKey: string = ''
  private logger: Logger;
  private nodeStore = new Map<string, NodeCert>()
  private readonly PORT;

  constructor() {
    assert(process.env.CA_PORT, 'CA_PORT is not set')

    this.PORT = process.env.CA_PORT

    this.logger = new Logger('ca')

    this.initCA()
  }

  private initCA() {
    pem.createCertificate({
      days: 3650,
      selfSigned: true,
      commonName: 'TLS-Simulation-CA'
    }, async (err: Error | null, keys: any) => {
      if (err) throw err
      this.caCert = keys.certificate
      this.caKey = keys.serviceKey

      await Bun.write('ca_cert.pem', this.caCert)
      await Bun.write('ca_key.pem', this.caKey)

      this.logger.log('[CA] Root certificate initialized')
      this.startServer()
    })
  }

  private issueCertificate(nodeId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Step 1: Generate a NEW keypair for this specific node
      pem.createPrivateKey(2048, (err: Error | null, privateKey: any) => {
        if (err) return reject(err);

        // Step 2: Create a CSR (Certificate Signing Request) with the new key
        pem.createCSR({
          commonName: `node-${nodeId}`,
          organization: 'TLS-Network',
          country: 'UA',
          clientKey: privateKey.key
        }, (err: Error | null, csr: any) => {
          if (err) return reject(err);

          // Step 3: Sign the CSR with CA's key to create the certificate
          pem.createCertificate({
            days: 365,
            serviceKey: this.caKey,
            serviceCertificate: this.caCert,
            csr: csr.csr,
            clientKey: privateKey.key
          }, (err: Error | null, cert: any) => {
            if (err) return reject(err);

            const result = {
              certificate: cert.certificate,
              serviceKey: privateKey.key  // ✅ Now this is the node's private key!
            };

            this.nodeStore.set(nodeId, {
              certificate: result.certificate,
              key: result.serviceKey,
              issuedAt: new Date(),
              revoked: false
            });

            resolve(result);
          });
        });
      });
    });
  }

  private validateCertificate(nodeId: string) {
    if (!this.nodeStore.has(nodeId)) {
      return {valid: false, reason: 'Certificate not found'}
    }
    const certData = this.nodeStore.get(nodeId)!
    if (certData.revoked) {
      return {valid: false, reason: 'Certificate has been revoked'}
    }
    return {valid: true, issuedAt: certData.issuedAt}
  }

  private parsePath(url: string) {
    const urlObj = new URL(url, `http://localhost:${this.PORT}`)
    return {
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams
    }
  }

  private sendJSON(data: any, statusCode = 200) {
    return new Response(JSON.stringify(data, null, 2), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  private startServer() {

    Bun.serve({
      port: this.PORT,
      fetch: async (req) => {
        // CORS preflight
        if (req.method === 'OPTIONS') {
          return new Response(null, {
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            }
          })
        }

        const {pathname} = this.parsePath(req.url)

        if (req.method === 'POST' && pathname === '/api/certificates/issue') {
          const body = await req.json()
          const {nodeId} = body
          if (!nodeId) {
            return this.sendJSON({error: 'nodeId is required'}, 400)
          }
          try {
            const cert = await this.issueCertificate(nodeId)
            return this.sendJSON({
              type: 'CERTIFICATE_ISSUED',
              nodeId,
              certificate: cert.certificate,
              key: cert.serviceKey,
              caCertificate: this.caCert,
              message: `Certificate issued for node-${nodeId}`
            })
          } catch (err: any) {
            return this.sendJSON({error: err.message}, 500)
          }
        }

        if (req.method === 'POST' && pathname === '/api/certificates/validate') {
          const body = await req.json()
          const {nodeId} = body

          if (!nodeId) {
            return this.sendJSON({error: 'nodeId is required'}, 400)
          }

          this.logger.log('validating certificate for node-' + nodeId)

          const result = this.validateCertificate(nodeId)
          return this.sendJSON({nodeId, ...result})
        }

        return this.sendJSON({
          error: 'Not Found',
          availableEndpoints: [
            'POST /api/certificates/issue',
            'POST /api/certificates/validate',
          ]
        }, 404)
      }
    })

    this.logger.log(`\nHTTP Server listening on http://localhost:${this.PORT}`)
    this.logger.log('Available endpoints:')
    this.logger.log('POST /api/certificates/issue')
    this.logger.log('POST /api/certificates/validate')
  }
}

new CertificateAuthorityServer()
