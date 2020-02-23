import crypto from 'crypto';
import { EventEmitter } from 'events';
import dgram from 'dgram';

import { LogFunction, Host } from './definitions';
import { supportedDevices, rfSupportedDevices } from './deviceTypes';

class Device {
  public log: LogFunction;
  public debug = false;

  public host: Host;
  public mac: Buffer;
  public type: number;

  public on: (event: string | symbol, listener: (message: string) => void) => EventEmitter;
  private emit: (event: string | symbol, ...args: (string | number | Buffer)[]) => boolean;

  public removeListener: (event: string | symbol, listener: (message: string) => void) => EventEmitter;
  public model: string;

  public checkRFData2?: () => void;
  public checkRFData?: () => void;
  public enterRFSweep?: () => void;

  private emitter: EventEmitter;
  private count: number;
  private key: Buffer;
  private iv: Buffer;
  private id: Buffer;
  private socket: dgram.Socket;

  constructor(host: Host, macAddress: Buffer, deviceType: number) {
    this.host = host;
    this.mac = macAddress;
    this.emitter = new EventEmitter();
    this.log = console.log;
    this.type = deviceType;
    this.model = supportedDevices[deviceType] || rfSupportedDevices[deviceType];

    this.on = this.emitter.on;
    this.emit = this.emitter.emit;
    this.removeListener = this.emitter.removeListener;

    this.count = Math.random() & 0xffff;
    this.key = new Buffer([0x09, 0x76, 0x28, 0x34, 0x3f, 0xe9, 0x9e, 0x23, 0x76, 0x5c, 0x15, 0x13, 0xac, 0xcf, 0x8b, 0x02]);
    this.iv = new Buffer([0x56, 0x2e, 0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58]);
    this.id = new Buffer([0, 0, 0, 0]);

    this.socket = this.setupSocket();

    // Dynamically add relevant RF methods if the device supports it
    const isRFSupported = rfSupportedDevices[deviceType];
    if (isRFSupported) this.addRFSupport();
  }

  // Create a UDP socket to receive messages from the broadlink device.
  private setupSocket(): dgram.Socket {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    socket.on('message', response => {
      const encryptedPayload = Buffer.alloc(response.length - 0x38, 0);
      response.copy(encryptedPayload, 0, 0x38);

      const errorCode = response[0x22] | (response[0x23] << 8);
      if (errorCode != 0) return;

      const decipher = crypto.createDecipheriv('aes-128-cbc', this.key, this.iv);
      decipher.setAutoPadding(false);

      let payload = decipher.update(encryptedPayload);

      const p2 = decipher.final();
      if (p2) payload = Buffer.concat([payload, p2]);

      if (!payload) return;

      const command = response[0x26];

      if (command == 0xe9) {
        this.key = Buffer.alloc(0x10, 0);
        payload.copy(this.key, 0, 0x04, 0x14);

        this.id = Buffer.alloc(0x04, 0);
        payload.copy(this.id, 0, 0x00, 0x04);

        this.emit('deviceReady');
      } else if (command == 0xee || command == 0xef) {
        this.onPayloadReceived(payload);
      } else {
        console.log('Unhandled Command: ', command);
      }
    });

    socket.bind();

    return socket;
  }

  public authenticate(): void {
    const payload = Buffer.alloc(0x50, 0);

    payload[0x04] = 0x31;
    payload[0x05] = 0x31;
    payload[0x06] = 0x31;
    payload[0x07] = 0x31;
    payload[0x08] = 0x31;
    payload[0x09] = 0x31;
    payload[0x0a] = 0x31;
    payload[0x0b] = 0x31;
    payload[0x0c] = 0x31;
    payload[0x0d] = 0x31;
    payload[0x0e] = 0x31;
    payload[0x0f] = 0x31;
    payload[0x10] = 0x31;
    payload[0x11] = 0x31;
    payload[0x12] = 0x31;
    payload[0x1e] = 0x01;
    payload[0x2d] = 0x01;
    payload[0x30] = 'T'.charCodeAt(0);
    payload[0x31] = 'e'.charCodeAt(0);
    payload[0x32] = 's'.charCodeAt(0);
    payload[0x33] = 't'.charCodeAt(0);
    payload[0x34] = ' '.charCodeAt(0);
    payload[0x35] = ' '.charCodeAt(0);
    payload[0x36] = '1'.charCodeAt(0);

    this.sendPacket(0x65, payload);
  }

  public sendPacket(command: number, payload: Buffer, debug = false): void {
    const { log, socket } = this;
    this.count = (this.count + 1) & 0xffff;

    let packet = Buffer.alloc(0x38, 0);

    packet[0x00] = 0x5a;
    packet[0x01] = 0xa5;
    packet[0x02] = 0xaa;
    packet[0x03] = 0x55;
    packet[0x04] = 0x5a;
    packet[0x05] = 0xa5;
    packet[0x06] = 0xaa;
    packet[0x07] = 0x55;
    packet[0x24] = 0x2a;
    packet[0x25] = 0x27;
    packet[0x26] = command;
    packet[0x28] = this.count & 0xff;
    packet[0x29] = this.count >> 8;
    packet[0x2a] = this.mac[5];
    packet[0x2b] = this.mac[4];
    packet[0x2c] = this.mac[3];
    packet[0x2d] = this.mac[2];
    packet[0x2e] = this.mac[1];
    packet[0x2f] = this.mac[0];
    packet[0x30] = this.id[0];
    packet[0x31] = this.id[1];
    packet[0x32] = this.id[2];
    packet[0x33] = this.id[3];

    let checksum = 0xbeaf;
    for (let i = 0; i < payload.length; i++) {
      checksum += payload[i];
      checksum = checksum & 0xffff;
    }

    const cipher = crypto.createCipheriv('aes-128-cbc', this.key, this.iv);
    payload = cipher.update(payload);

    packet[0x34] = checksum & 0xff;
    packet[0x35] = checksum >> 8;

    packet = Buffer.concat([packet, payload]);

    checksum = 0xbeaf;
    for (let i = 0; i < packet.length; i++) {
      checksum += packet[i];
      checksum = checksum & 0xffff;
    }

    packet[0x20] = checksum & 0xff;
    packet[0x21] = checksum >> 8;

    if (debug) log('\x1b[33m[DEBUG]\x1b[0m packet', packet.toString('hex'));

    socket.send(packet, 0, packet.length, this.host.port, this.host.address, (error, bytes) => {
      if (debug && error) log('\x1b[33m[DEBUG]\x1b[0m send packet error', error.message);
      if (debug) log('\x1b[33m[DEBUG]\x1b[0m successfuly sent packet - bytes: ', bytes.toString());
    });
  }

  private onPayloadReceived(payload: Buffer): void {
    const param = payload[0];

    const data = Buffer.alloc(payload.length - 4, 0);
    payload.copy(data, 0, 4);

    switch (param) {
      case 1: {
        const temp = (payload[0x4] * 10 + payload[0x5]) / 10.0;
        this.emit('temperature', temp);
        break;
      }
      case 4: {
        //get from check_data
        const data = Buffer.alloc(payload.length - 4, 0);
        payload.copy(data, 0, 4);
        this.emit('rawData', data);
        break;
      }
      case 26: {
        //get from check_data
        const data = Buffer.alloc(1, 0);
        payload.copy(data, 0, 0x4);
        if (data[0] !== 0x1) break;
        this.emit('rawRFData', data);
        break;
      }
      case 27: {
        //get from check_data
        const data = Buffer.alloc(1, 0);
        payload.copy(data, 0, 0x4);
        if (data[0] !== 0x1) break;
        this.emit('rawRFData2', data);
        break;
      }
    }
  }

  // Externally Accessed Methods

  public checkData(): void {
    const packet = Buffer.alloc(16, 0);
    packet[0] = 4;
    this.sendPacket(0x6a, packet);
  }

  public sendData(data: Uint8Array, debug = false): void {
    let packet = new Buffer([0x02, 0x00, 0x00, 0x00]);
    packet = Buffer.concat([packet, data]);
    this.sendPacket(0x6a, packet, debug);
  }

  public enterLearning(): void {
    const packet = Buffer.alloc(16, 0);
    packet[0] = 3;
    this.sendPacket(0x6a, packet);
  }

  public checkTemperature(): void {
    const packet = Buffer.alloc(16, 0);
    packet[0] = 1;
    this.sendPacket(0x6a, packet);
  }

  public cancelLearn(): void {
    const packet = Buffer.alloc(16, 0);
    packet[0] = 0x1e;
    this.sendPacket(0x6a, packet);
  }

  private addRFSupport(): void {
    this.enterRFSweep = (): void => {
      const packet = Buffer.alloc(16, 0);
      packet[0] = 0x19;
      this.sendPacket(0x6a, packet);
    };

    this.checkRFData = (): void => {
      const packet = Buffer.alloc(16, 0);
      packet[0] = 0x1a;
      this.sendPacket(0x6a, packet);
    };

    this.checkRFData2 = (): void => {
      const packet = Buffer.alloc(16, 0);
      packet[0] = 0x1b;
      this.sendPacket(0x6a, packet);
    };
  }
}

export default Device;
