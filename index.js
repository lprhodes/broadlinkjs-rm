var util = require('util');
let EventEmitter = require('events');
let dgram = require('dgram');
let os = require('os');
let crypto = require('crypto');

var Broadlink = module.exports = function(){
    EventEmitter.call(this);
    this.devices = {};
}
util.inherits(Broadlink, EventEmitter);


Broadlink.prototype.genDevice = function (devtype, host, mac){
    var dev;
    if(devtype == 0x2712){ // RM2
        dev = new device(host,mac);
        dev.rm();
        return dev;;
    }else if(devtype == 0x2737){ // RM Mini
        dev = new device(host,mac);
        dev.rm();
        return dev;;
    }else if(devtype == 0x273d){ // RM Pro Phicomm
        dev = new device(host,mac);
        dev.rm();
        return dev;;
    }else if(devtype == 0x2783){ // RM2 Home Plus
        dev = new device(host,mac);
        dev.rm();
        return dev;;
    }else if(devtype == 0x277c){ // RM2 Home Plus GDT
        dev = new device(host,mac);
        dev.rm();
        return dev;;
    }else if(devtype == 0x272a){ // RM2 Pro Plus
        dev = new device(host,mac);
        dev.rm(true);
        return dev;;
    }else if(devtype == 0x2787){ // RM2 Pro Plus2
        dev = new device(host,mac);
        dev.rm(true);
        return dev;;
    }else if(devtype == 0x278b){ // RM2 Pro Plus BL
        dev = new device(host,mac);
        dev.rm(true);
        return dev;;
    }else if(devtype == 0x278f){ // RM Mini Shate
        dev = new device(host,mac);
        dev.rm();
        return dev;;
    }else if(devtype == 0x279d){ // RM3 Pro Plus
        dev = new device(host,mac);
        dev.rm(true);
        return dev;;
    }else{
      return null;
    }
}

Broadlink.prototype.discover = function(){
    self = this;
    var interfaces = os.networkInterfaces();
    var addresses = [];
    for (var k in interfaces) {
        for (var k2 in interfaces[k]) {
            var address = interfaces[k][k2];
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        }
    }
    var address = addresses[0].split('.');

    var cs = dgram.createSocket({ type:'udp4', reuseAddr:true});
    cs.on('listening', function(){
        cs.setBroadcast(true);

        var port = cs.address().port;
        var now = new Date();
        var starttime = now.getTime();

        var timezone = now.getTimezoneOffset()/-3600;
        var packet = Buffer.alloc(0x30,0);

        var year = now.getYear();

        if(timezone < 0){
            packet[0x08] = 0xff + timezone - 1;
            packet[0x09] = 0xff;
            packet[0x0a] = 0xff;
            packet[0x0b] = 0xff;
        }else{
            packet[0x08] = timezone;
            packet[0x09] = 0;
            packet[0x0a] = 0;
            packet[0x0b] = 0;
        }
        packet[0x0c] = year & 0xff;
        packet[0x0d] = year >> 8;
        packet[0x0e] = now.getMinutes();
        packet[0x0f] = now.getHours();
        var subyear = year%100;
        packet[0x10] = subyear;
        packet[0x11] = now.getDay();
        packet[0x12] = now.getDate();
        packet[0x13] = now.getMonth();
        packet[0x18] = parseInt(address[0]);
        packet[0x19] = parseInt(address[1]);
        packet[0x1a] = parseInt(address[2]);
        packet[0x1b] = parseInt(address[3]);
        packet[0x1c] = port & 0xff;
        packet[0x1d] = port >> 8;
        packet[0x26] = 6;
        var checksum = 0xbeaf;

        for (var i = 0; i < packet.length; i++){
            checksum += packet[i];
        }
        checksum = checksum & 0xffff;
        packet[0x20] = checksum & 0xff;
        packet[0x21] = checksum >> 8;

        cs.sendto(packet, 0, packet.length, 80, '255.255.255.255');

    });

    cs.on("message", (msg, rinfo) => {
        var host = rinfo;
        var mac = Buffer.alloc(6,0);

        msg.copy(mac, 0x00, 0x3D);
        msg.copy(mac, 0x01, 0x3E);
        msg.copy(mac, 0x02, 0x3F);
        msg.copy(mac, 0x03, 0x3C);
        msg.copy(mac, 0x04, 0x3B);
        msg.copy(mac, 0x05, 0x3A);

        var devtype = msg[0x34] | msg[0x35] << 8;
        if(!this.devices){
            this.devices = {};
        }

        if(!this.devices[mac]){
            var dev =  this.genDevice(devtype, host, mac);
            if (dev) {
              this.devices[mac] = dev;
              dev.on("deviceReady", () => { this.emit("deviceReady", dev); });
              dev.auth();
            }
        }
    });

    cs.bind();
}

function device( host, mac, timeout=10){
    this.host = host;
    this.mac = mac;
    this.emitter = new EventEmitter();

    this.on = this.emitter.on;
    this.emit = this.emitter.emit;
    this.removeListener = this.emitter.removeListener;

    this.timeout = timeout;
    this.count = Math.random()&0xffff;
    this.key = new Buffer([0x09, 0x76, 0x28, 0x34, 0x3f, 0xe9, 0x9e, 0x23, 0x76, 0x5c, 0x15, 0x13, 0xac, 0xcf, 0x8b, 0x02]);
    this.iv = new Buffer([0x56, 0x2e, 0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58]);
    this.id = new Buffer([0, 0, 0, 0]);
    this.cs = dgram.createSocket({ type:'udp4', reuseAddr:true});
    this.cs.on('listening', function(){
        //this.cs.setBroadcast(true);
    });

    this.cs.on("message", (response, rinfo) => {
        var enc_payload = Buffer.alloc(response.length-0x38,0);
        response.copy(enc_payload, 0, 0x38);

        var decipher = crypto.createDecipheriv('aes-128-cbc', this.key, this.iv);
        decipher.setAutoPadding(false);
        var payload = decipher.update(enc_payload);
        var p2 = decipher.final();
        if(p2){
            payload = Buffer.concat([payload,p2]);
        }

        if(!payload){
            return false;
        }

        var command = response[0x26];
        var err = response[0x22] | (response[0x23] << 8);



        if(err != 0) {
          // console.log('err', err)

          return;
        }

        if(command == 0xe9){
            this.key = Buffer.alloc(0x10,0);
            payload.copy(this.key, 0, 0x04, 0x14);

            this.id = Buffer.alloc(0x04,0);
            payload.copy(this.id, 0, 0x00, 0x04);
            this.emit("deviceReady");
        }else if (command == 0xee || command == 0xef){
            this.emit("payload", err, payload);
        } else {
          console.log('command', command)
        }

    });
    this.cs.bind();
    this.type = "Unknown";
}

device.prototype.auth = function(){
    var payload = Buffer.alloc(0x50,0);
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

device.prototype.getType = function(){
    return this.type;
}

device.prototype.sendPacket = function(command, payload, debug = false){
    this.count = (this.count + 1) & 0xffff;
    var packet = Buffer.alloc(0x38,0);
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

    var checksum = 0xbeaf;
    for (var i = 0 ; i < payload.length; i++){
        checksum += payload[i];
        checksum = checksum & 0xffff;
    }

    var cipher = crypto.createCipheriv('aes-128-cbc', this.key, this.iv);
    payload = cipher.update(payload);
    var p2 = cipher.final();


    var decipher = crypto.createDecipheriv('aes-128-cbc', this.key, this.iv);
    decipher.setAutoPadding(false);

    // console.log('buffer a', Buffer.from('350bf7fc83abdfb952fa541cb94ed611', 'hex'));

    var decryptedPayload = decipher.update(Buffer.from('350bf7fc83abdfb952fa541cb94ed611', 'hex'));
    var p3 = decipher.final();
    if(p3){
        decryptedPayload = Buffer.concat([decryptedPayload,p3]);
    }

    // console.log('decryptedPayload', decryptedPayload.toString('hex'))

    packet[0x34] = checksum & 0xff;
    packet[0x35] = checksum >> 8;

    packet = Buffer.concat([packet, payload]);

    checksum = 0xbeaf;
    for (var i = 0 ; i < packet.length; i++){
        checksum += packet[i];
        checksum = checksum & 0xffff;
    }
    packet[0x20] = checksum & 0xff;
    packet[0x21] = checksum >> 8;

    if (debug) {
        console.log('packet', packet.toString('hex'))
    }

    this.cs.send(packet, 0, packet.length, this.host.port, this.host.address, (err, bytes) => {
        if (debug && err) console.log('send packet error', err)
        if (debug) console.log('sent packet - bytes: ', bytes)
    });
}

device.prototype.rm = function(isPlus){
    this.type = "RM2";
    this.checkData = function(){
        var packet = Buffer.alloc(16,0);
        packet[0] = 4;
        this.sendPacket(0x6a, packet);
    }

    if (isPlus) {
      this.enterRFSweep = function(){
          var packet = Buffer.alloc(16,0);
          packet[0] = 0x19;
          this.sendPacket(0x6a, packet);
      }

      this.checkRFData = function(){
        var packet = Buffer.alloc(16,0);
        packet[0] = 0x1a;
        this.sendPacket(0x6a, packet);
      }

      this.checkRFData2 = function(){
        var packet = Buffer.alloc(16,0);
        packet[0] = 0x1b;
        this.sendPacket(0x6a, packet);
      }

      this.cancelRFSweep = function(){
          var packet = Buffer.alloc(16,0);
          packet[0] = 0x1e;
          this.sendPacket(0x6a, packet);
      }
    }

    this.sendData = function(data, debug = false){
        packet = new Buffer([0x02, 0x00, 0x00, 0x00]);
        packet = Buffer.concat([packet, data]);
        this.sendPacket(0x6a, packet, debug);
    }

    this.enterLearning = function(){
        var packet = Buffer.alloc(16,0);
        packet[0] = 3;
        this.sendPacket(0x6a, packet);
    }

    this.checkTemperature = function(){
        var packet = Buffer.alloc(16,0);
        packet[0] = 1;
        this.sendPacket(0x6a, packet);
    }

    this.on("payload", (err, payload) => {
        var param = payload[0];
        // console.log('param', param)


        var data = Buffer.alloc(payload.length - 4,0);
        payload.copy(data, 0, 4);

        switch (param){
            case 1:
                var temp = (payload[0x4] * 10 + payload[0x5]) / 10.0;
                this.emit("temperature", temp);
                break;
            case 4: //get from check_data
                var data = Buffer.alloc(payload.length - 4,0);
                payload.copy(data, 0, 4);
                this.emit("rawData", data);
                break;
            case 26: //get from check_data
                var data = Buffer.alloc(1,0);
                payload.copy(data, 0, 0x4);
                // console.log('payload', payload)

                // console.log('data', data)

                if (data[0] !== 0x1) break;

                this.emit("rawRFData", data);
                break;
            case 27: //get from check_data
                var data = Buffer.alloc(1,0);
                payload.copy(data, 0, 0x4);
                // console.log('payload', payload)

                // console.log('data', data)

                if (data[0] !== 0x1) break;

                this.emit("rawRFData2", data);
                break;
            case 3:
                break;
            case 4:
                break;
        }
    });
}
