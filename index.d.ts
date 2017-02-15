/// <reference types="node" />

import { EventEmitter } from "events";

export = Broadlink;

declare class Broadlink extends EventEmitter {
    constructor();

    on(event: "deviceReady", listener: (device: Broadlink.Device) => void): this;

    discover(): void;
}

declare namespace Broadlink {

    class Device {
        constructor(host: string, mac: Buffer, timeout?: number);

        auth();

        getType(): string;

        sendPacket(command: number, payload: Buffer): void;
    }

    export class MP1 extends Device {

    }

    export class SP1 extends Device {

    }

    export class SP2 extends Device {

    }

    export class A1 extends Device {

    }

    export class RM2 extends Device {
        checkData(): void;
        sendData(data: Buffer): void;
        enterLearning(): void;
        checkTemperature(): void;

        on(event: 'temperature', listener: (temp: number) => void): this;
        on(event: 'rawData', listener: (data: Buffer) => void): this;
    }
}