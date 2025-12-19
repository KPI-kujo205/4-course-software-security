import {Logger} from '@/logger';
import {NodeConfig, NodeCert} from '@/node/config';
import {CAApi} from "@/node/caApi";
import {NetworkPacket, PacketType} from '@/node/types';
import {assert} from "@/helpers/assert";
import {PacketAssembler} from "@/node/PacketAssembler";

export class Node {
  private readonly logger: Logger;
  private readonly ca: CAApi;
  private readonly assembler = new PacketAssembler();
  private certData?: NodeCert;

  constructor(private readonly config: NodeConfig) {
    this.logger = new Logger(config);
    this.ca = new CAApi(this.config.caUrl);
    this.init();
  }

  private async init() {
    await this.setupCACertificates();
    this.startServer();
  }

  private async setupCACertificates() {
    try {
      const data = await this.ca.issueCertificate(this.config.nodeId);
      this.certData = {
        certificate: data.certificate,
        key: data.key,
        issuedAt: new Date(),
        revoked: false
      };
      this.logger.log('Certificate issued and stored successfully');
    } catch (err: any) {
      this.logger.log(`Security Setup Failed: ${err.message}`);
      throw err;
    }
  }

  private startServer() {
    Bun.serve({
      port: this.config.port,
      fetch: (req) => this.handleHttpRequest(req),
    });
    this.logger.log(`Node ${this.config.nodeId} listening on port ${this.config.port}`);
  }

  private async handleHttpRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/receive" && req.method === "POST") {
      const packet: NetworkPacket = await req.json();
      return this.onPacketReceived(packet);
    }

    if (url.pathname === "/initiate" && req.method === "POST") {
      const {target, data} = await req.json();
      assert(target && data, "Target and data are required for initiation");

      await this.transmit(target, data, "DATA");
      return Response.json({status: "Transmission Started"});
    }

    return new Response("Not Found", {status: 404});
  }

  /**
   * Core logic for handling any incoming NetworkPacket.
   */
  private async onPacketReceived(packet: NetworkPacket): Promise<Response> {
    const isForMe = packet.header.dest === this.config.nodeId;

    if (isForMe) {
      this.processInbound(packet);
      return new Response("Received");
    }

    return this.forward(packet);
  }

  /**
   * Forwards a packet to the next hop based on topology.
   */
  private async forward(packet: NetworkPacket): Promise<Response> {
    const nextHopUrl = this.config.topology.getNextHopUrl(packet.header.dest);

    if (!nextHopUrl) {
      this.logger.log(`Routing Error: No path to ${packet.header.dest}`);
      return new Response("Destination Unreachable", {status: 404});
    }

    const targetUrl = `${nextHopUrl}/receive`;
    this.logger.log(`Routing: ${packet.header.src} -> ${this.config.nodeId} -> ${packet.header.dest}`);

    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(packet),
      });

      assert(res.ok, `Upstream responded with ${res.status}`);
      return new Response("Forwarded");
    } catch (e: any) {
      this.logger.log(`Forwarding failed to ${targetUrl}: ${e.message}`);
      return new Response("Gateway Error", {status: 502});
    }
  }

  /**
   * Handles packet assembly and protocol dispatching.
   */
  private processInbound(packet: NetworkPacket) {
    const fullMessage = this.assembler.assemble(packet);

    if (fullMessage) {
      this.logger.log(`[Message from ${packet.header.src}]: ${fullMessage}`);
      this.dispatchProtocol(packet.header.type, fullMessage, packet.header.src);
    }
  }

  private dispatchProtocol(type: PacketType, message: string, from: string) {
    if (type === "HANDSHAKE") {
      // TODO: Implement TLS Handshake logic
    }
  }

  /**
   * Public method to send messages (applies MTU fragmentation).
   */
  private async transmit(target: string, data: string, type: PacketType) {
    const MTU = 10;
    const msgId = crypto.randomUUID();
    const total = Math.ceil(data.length / MTU);

    for (let i = 0; i < total; i++) {
      const chunk = data.substring(i * MTU, (i + 1) * MTU);
      const packet = this.createPacket(target, msgId, chunk, i, total, type);

      const nextHop = this.config.topology.getNextHopUrl(target);
      assert(nextHop, `No route found for target: ${target}`);

      await fetch(`${nextHop}/receive`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(packet),
      });
    }
  }

  private createPacket(dest: string, msgId: string, body: string, idx: number, total: number, type: PacketType): NetworkPacket {
    return {
      header: {
        src: this.config.nodeId,
        dest,
        msgId,
        packetIdx: idx,
        total,
        type,
      },
      body,
    };
  }
}

export default new Node(new NodeConfig());
