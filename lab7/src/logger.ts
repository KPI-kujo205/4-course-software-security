import {NodeConfig} from './node/config'

export class Logger {
  constructor(private config: NodeConfig) {}


  log(message: string): void {
    console.log(`[node ${this.config.nodeId}] ${message}`);
  }
}
