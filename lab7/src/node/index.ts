import {Logger} from '@/logger'
import {NodeConfig, NodeCert} from './config'
import {CAApi} from "@/node/caApi";

export class Node {
  private logger: Logger;
  private ca: CAApi;

  private certData: NodeCert!;

  constructor(private config: NodeConfig) {
    this.logger = new Logger(config);
    this.logger.log('initializing server')

    this.ca = new CAApi(this.config.caUrl)
    this.requestAndStoreCertificate()
  }

  async requestAndStoreCertificate() {
    try {
      const data = await this.ca.issueCertificate(this.config.nodeId)
      this.certData = {
        certificate: data.certificate,
        key: data.key,
        caCertificate: data.caCertificate,
        issuedAt: new Date(),
      }
    } catch (err: any) {
      this.logger.log(`Failed to issue certificate: ${err.message}`)
      throw err
    }
    this.logger.log('ca certificate requested and stored successfully')
  }
}

export default new Node(new NodeConfig())
