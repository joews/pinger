var raw = require('raw-socket');

// Tiny ping implementation
// https://www.ietf.org/rfc/rfc792.txt
var TWO_16 = Math.pow(2, 16);

// ICMP responses
var responses = {
  0: 'echo',
  3: 'destination unreachable',
  4: 'source quench',
  5: 'redirect',
  11: 'time exceeded',
  12: 'parameter problem',
  14: 'timestamp',
  16: 'information'
}

function Pinger(options) {
  this.options = options || {};

  this.seq = 0;
  this.id = this.getId();
  this.ttl = this.options.ttl || 3; 
  
  this.socket = this.createSocket();
  this.listen();
}

Pinger.prototype.createSocket = function createSocket() {
  return raw.createSocket({
    protocol: raw.Protocol.ICMP,
  });
}

Pinger.prototype.close = function() {
  // TODO
},

Pinger.prototype.getId = function(options) {
  if(this.options && this.options.id) return this.options.id;
  return process.pid % TWO_16;
}

Pinger.prototype.nextSeq = function nextSeq() {
  return this.seq ++ % TWO_16;
}

Pinger.prototype.listen = function listen() {
  this.socket.on('message', function(buffer, source) {
    console.log('received', buffer.length, 'bytes from', source);

    // First byte of IP header is version::length.
    // Take last 4 bits to get length. Length is number of 32-bit words
    //  in the packet. 32 bits -> 4 bytes.
    var ipLength = buffer[0] & 0x0f,
        ipOffset = ipLength * 4;
    
    var offset = 20; // IP header length

    var type = buffer.readUInt8(offset);
    var code = buffer.readUInt8(offset + 1);
    
    var checksum = buffer.readUInt16BE(offset + 2);
    var id = buffer.readUInt16BE(offset + 4);
    var seq = buffer.readUInt16BE(offset + 6);
    
    var typeStr = responses[type];

    //if(id === this.id) {
    console.log('Response', typeStr, seq);

    //} else {
    //  console.log('Response to another process', type, id, seq)
    //}
  }.bind(this));
}

function readSuccess() {

}

function readError () {

}

Pinger.prototype.buildBuffer = function(type, code) {
  // TODO send some data;
  var size = 8;
  var buffer = new Buffer(size);

  buffer.writeUInt8 (type, 0);
  buffer.writeUInt8 (code, 1);
  buffer.writeUInt16BE (0x0, 2);  // placeholder for checksum
  buffer.writeUInt16BE (this.id, 4); 
  buffer.writeUInt16BE (this.nextSeq(), 6); 
  
  // write the real checksum
  raw.writeChecksum (buffer, 2, raw.createChecksum (buffer)); 

  return buffer;
}

Pinger.prototype.ping = function(ip) {
  // ICMP echo request
  var buffer = this.buildBuffer(0x8, 0x0);
  this.socket.send(buffer, 0, buffer.length, ip, this.onBeforeSend.bind(this))
}

Pinger.prototype.onBeforeSend = function onAfterSend() {
  this.socket.setOption(raw.SocketLevel.IPPROTO_IP, raw.SocketOption.IP_TTL, this.ttl);
}

// Singleton instance
var instance;
function ping(ip) {
  if(!instance) {
    instance = new Pinger();
  }

  return instance.ping(ip);
}

module.exports = {
  Pinger: Pinger,
  ping: ping
}
