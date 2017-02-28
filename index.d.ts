/// <reference types="node" />

import { EventEmitter } from "events";

export = Broadlink;

/**
 * Class representing the Broadlink library
 */
declare class Broadlink extends EventEmitter {
    constructor();

    /**
     * Returns a found Broadlink device. Cast this to a specific
     * device type class to get more functions
     */
    on(event: "deviceReady", listener: (device: Broadlink.Device) => void): this;

    /**
     * Start the discovery procedure
     */
    discover(): void;
}

declare namespace Broadlink {

    /**
     * Class representing a generic Broadlink device
     */
    class Device {
        constructor(host: string, mac: Buffer, timeout?: number);

        /**
         * Authenticate before use (this is done automatically)
         */
        auth();

        /**
         * Get the device type
         */
        getType(): string;

        /**
         * Send a raw binary packet
         * @param command - command in little-endian 16 bit integer
         * @param payload - binary content of the command
         */
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

    /**
     * Class representing Broadlink RM2 remote control devices
     * and similar devices
     */
    export class RM2 extends Device {
        
        /**
         * Let the device enter learning mode
         */
        enterLearning(): void;
        
        /**
         * Request the device to send the data
         * that was captured while in learning mode
         */
        checkData(): void;

        /**
         * Send a remote control command to the device.
         * @param data - data that was captured in learning mode
         */
        sendData(data: Buffer): void;

        /**
         * Request the device to send the temperature
         */
        checkTemperature(): void;

        /**
         * Event that is triggered when a temperature response is
         * received from the device
         * @param listener - callback with temperature in Celcius as parameter
         */
        on(event: 'temperature', listener: (temp: number) => void): this;

        /**
         * Event that is triggered when a learning data response is
         * received from the device
         * @param listener - callback with binary data as parameter
         */
        on(event: 'rawData', listener: (data: Buffer) => void): this;
    }
}