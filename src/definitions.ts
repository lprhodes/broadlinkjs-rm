import { EventEmitter } from 'events';

export interface Device {
  log: LogFunction;
  debug: boolean;

  host: Host;
  mac: Buffer;
  type: number;

  on: (event: string | symbol, listener: (message: string) => void) => EventEmitter;

  removeListener: (event: string | symbol, listener: (message: string) => void) => EventEmitter;
  model: string;
  checkRFData2?: () => void;
  checkRFData?: () => void;
  enterRFSweep?: () => void;

  authenticate(): void;
  sendPacket(command: number, payload: Buffer, debug: boolean): void;
  checkData(): void;
  sendData(data: Uint8Array, debug: boolean): void;
  enterLearning(): void;
  checkTemperature(): void;
  cancelLearn(): void;
}

export type LogFunction = (message: string, message2?: string) => void;
export type DeviceTypes = { [key: number]: string };
export type Devices = { [key: string]: Device };

export interface Host {
  port: number;
  address: string;
}
