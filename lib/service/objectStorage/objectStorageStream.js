var util = require('util')
  , Stream = require('stream')
  ;


var ObjectStorageStream = function() {
  Stream.call(this);
  this.readable = true;
  this.writable = true;
  this.paused = false;
};

util.inherits(ObjectStorageStream, Stream);

ObjectStorageStream.prototype.write = function(chunk) {
  this.emit('data', chunk);
  if (this._paused) { return false; }
};

ObjectStorageStream.prototype.end = function(chunk) {
  if (arguments.length) { this.write(chunk); }
  this.writable = false;
  this.emit('end');
};

ObjectStorageStream.prototype.destroy = function() {
  this.writable = false;
};

ObjectStorageStream.prototype.pause = function() {
  this._paused = true;
};

ObjectStorageStream.prototype.resume = function() {
  this._paused = false;
  this.emit('drain');
};

module.exports = ObjectStorageStream;
