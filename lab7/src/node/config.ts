import * as process from "node:process";
import {assert} from "@/helpers/assert";

export interface NodeCert {
  certificate: string
  key: string
  issuedAt: Date
  revoked?: boolean
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

  topology: Topology

  constructor() {
    const envsVars = [
      'NODE_ID', 'CA_URL', 'TOPOLOGY_NEIGHBOURS'
    ] as const

    for (const envVar of envsVars) {
      assert(process.env[envVar], `${envVar} environment variable is not set`);
    }

    this.nodeId = process.env.NODE_ID!;
    this.caUrl = process.env.CA_URL!

    this.topology = new Topology(process.env.TOPOLOGY_NEIGHBOURS!, this.nodeId)
  }
}

class Topology {
  private nodeId: string;

  private neighboursMap: Record<string, Set<string>>;

  /**
   * @param neighbours -
   * server pairs in the topology, separated by the comma, like a:b,b:c etc
   *
   * @param nodeId
   * id of a node
   */
  constructor(private neighbours: string, nodeId: string) {
    this.nodeId = nodeId;

    const neighbourMap: Record<string, Set<string>> = {};

    for (const pair of this.neighbours.split(',')) {
      const [from, to] = pair.split(':');
      if (!neighbourMap[from]) neighbourMap[from] = new Set();
      if (!neighbourMap[to]) neighbourMap[to] = new Set();
      neighbourMap[from].add(to);
      neighbourMap[to].add(from);
    }

    this.neighboursMap = neighbourMap;
  }

  isNodeNeighbour(someNode: string): boolean {
    const neighbours = this.neighboursMap[this.nodeId];
    return neighbours ? neighbours.has(someNode) : false;
  }
}
