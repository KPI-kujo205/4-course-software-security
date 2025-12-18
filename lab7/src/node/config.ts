import * as process from "node:process";
import {assert} from "@/helpers/assert";

export interface NodeCert {
  certificate: string
  caCertificate: string
  key: string
  issuedAt: Date
}


export class NodeConfig {
  /**
   * Id of a node, like a,b,c etc
   */
  nodeId: string;

  /**
   * url of the CA server to request certificates from
   */
  caUrl: string;

  /**
   * server pairs in the topology, separated by the comma, like a:b,b:c etc
   */
  topology: string

  constructor() {
    assert(process.env.NODE_ID, 'NODE_ID environment variable is not set');

    this.nodeId = process.env.NODE_ID;

    assert(process.env.CA_URL, 'CA_URL environment variable is not set');

    this.caUrl = process.env.CA_URL

    assert(process.env.TOPOLOGY, 'TOPOLOGY environment variable is not set');

    this.topology = process.env.TOPOLOGY
  }
}
