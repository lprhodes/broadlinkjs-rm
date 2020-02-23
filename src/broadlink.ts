import events from 'events';
import dgram from 'dgram';
import os from 'os';
import assert from 'assert';

import { Devices, LogFunction, Host } from './definitions';
import { unsupportedDevices, rfSupportedDevices, supportedDevices } from './deviceTypes';
import Device from './device';

class Broadlink extends events.EventEmitter {
  debug = false;
  log: LogFunction = console.log;

  devices: Devices = {};
  sockets: Array<dgram.Socket> = [];

  public discover(): void {
    // Close existing sockets
    this.sockets.forEach(socket => {
      socket.close();
    });

    this.sockets = [];

    // Open a UDP socket on each network interface/IP address
    const ipAddresses = this.getIPAddresses();

    ipAddresses.forEach(ipAddress => {
      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      this.sockets.push(socket);

      socket.on('listening', this.onListening.bind(this, socket, ipAddress));
      socket.on('message', this.onMessage.bind(this));

      socket.bind(0, ipAddress);
    });
  }

  private getIPAddresses(): Array<string> {
    const interfaces = os.networkInterfaces();
    const ipAddresses: Array<string> = [];

    Object.keys(interfaces).forEach(interfaceID => {
      const currentInterface = interfaces[interfaceID];

      currentInterface.forEach(address => {
        if (address.family === 'IPv4' && !address.internal) {
          ipAddresses.push(address.address);
        }
      });
    });

    return ipAddresses;
  }

  onListening(socket: dgram.Socket, ipAddress: string): void {
    const { debug, log } = this;

    // Broadcase a multicast UDP message to let Broadlink devices know we're listening
    socket.setBroadcast(true);

    const splitIPAddress = ipAddress.split('.');
    const port = socket.address().port;

    if (debug && log) log(`\x1b[35m[INFO]\x1b[0m Listening for Broadlink devices on ${ipAddress}:${port} (UDP)`);

    const now = new Date();

    const timezone = now.getTimezoneOffset() / -3600;
    const packet = Buffer.alloc(0x30, 0);

    const year = now.getFullYear();

    if (timezone < 0) {
      packet[0x08] = 0xff + timezone - 1;
      packet[0x09] = 0xff;
      packet[0x0a] = 0xff;
      packet[0x0b] = 0xff;
    } else {
      packet[0x08] = timezone;
      packet[0x09] = 0;
      packet[0x0a] = 0;
      packet[0x0b] = 0;
    }

    packet[0x0c] = year & 0xff;
    packet[0x0d] = year >> 8;
    packet[0x0e] = now.getMinutes();
    packet[0x0f] = now.getHours();

    const subyear = year % 100;
    packet[0x10] = subyear;
    packet[0x11] = now.getDay();
    packet[0x12] = now.getDate();
    packet[0x13] = now.getMonth();
    packet[0x18] = parseInt(splitIPAddress[0]);
    packet[0x19] = parseInt(splitIPAddress[1]);
    packet[0x1a] = parseInt(splitIPAddress[2]);
    packet[0x1b] = parseInt(splitIPAddress[3]);
    packet[0x1c] = port & 0xff;
    packet[0x1d] = port >> 8;
    packet[0x26] = 6;

    let checksum = 0xbeaf;

    for (let i = 0; i < packet.length; i++) {
      checksum += packet[i];
    }

    checksum = checksum & 0xffff;
    packet[0x20] = checksum & 0xff;
    packet[0x21] = checksum >> 8;

    socket.send(packet, 0, packet.length, 80, '255.255.255.255');
  }

  onMessage(message: Buffer, host: Host): void {
    // Broadlink device has responded
    const macAddress = Buffer.alloc(6, 0);

    message.copy(macAddress, 0x00, 0x3d);
    message.copy(macAddress, 0x01, 0x3e);
    message.copy(macAddress, 0x02, 0x3f);
    message.copy(macAddress, 0x03, 0x3c);
    message.copy(macAddress, 0x04, 0x3b);
    message.copy(macAddress, 0x05, 0x3a);

    // Ignore if we already know about this device
    const key = macAddress.toString('hex');
    if (this.devices[key]) return;

    const deviceType = message[0x34] | (message[0x35] << 8);
    const deviceTypeHex = parseInt(deviceType.toString(), 16);

    // Create a Device instance
    this.addDevice(host, macAddress, deviceTypeHex);
  }

  addDevice(host: Host, macAddress: Buffer, deviceTypeHex: number): void {
    const { log, debug } = this;

    // Ignore if we've already detected this device
    const key = macAddress.toString('hex');
    if (this.devices[key]) return;

    const isHostObjectValid = typeof host === 'object' && (host.port || host.port === 0) && host.address;

    assert(isHostObjectValid, `createDevice: host should be an object e.g. { address: '192.168.1.32', port: 80 }`);
    assert(macAddress, `createDevice: A unique macAddress should be provided`);
    assert(deviceTypeHex, `createDevice: A deviceType from the rmDeviceTypes or rmPlusDeviceTypes list should be provided`);

    // Ignore devices that don't support infrared or RF.
    if (unsupportedDevices[deviceTypeHex]) return;
    if (deviceTypeHex >= 0x7530 && deviceTypeHex <= 0x7918) return; // OEM branded SPMini2

    // If we don't know anything about the device we ask the user to provide details so that
    // we can handle it correctly.
    const isKnownDevice = supportedDevices[deviceTypeHex] || rfSupportedDevices[deviceTypeHex];

    if (!isKnownDevice) {
      const deviceId = deviceTypeHex.toString(16);
      const logMessage = `\n\x1b[35m[Info]\x1b[0m We've discovered an unknown Broadlink device. This likely won't cause any issues.\n\nPlease raise an issue in the GitHub repository (https://github.com/lprhodes/homebridge-broadlink-rm/issues) with details of the type of device and its device type code: "${deviceId}". The device is connected to your network with the IP address "${host.address}".\n`;
      log(logMessage);

      return;
    }

    // The Broadlink device is something we can use.
    const device = new Device(host, macAddress, deviceTypeHex);
    device.log = log;
    device.debug = debug;

    this.devices[key] = device;

    // Authenticate the device and let others know when it's ready.
    device.on('deviceReady', () => {
      this.emit('deviceReady', device);
    });

    device.authenticate();
  }
}

export default Broadlink;
