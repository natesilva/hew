var util = require('util')
  , Stream = require('stream')
  , crypto = require('crypto')
  ;

/**
 * A stream that calculates the MD5 hash of the file being piped through it.
 * @ignore
 */
var HashingPassThroughStream = function() {
  Stream.call(this);
  this.readable = true;
  this.writable = true;
  this.paused = false;
  this._hash = crypto.createHash('md5');
  this.hashDigest
};

util.inherits(HashingPassThroughStream, Stream);

HashingPassThroughStream.prototype.write = function(chunk) {
  this._hash.update(chunk);
  this.emit('data', chunk);
  if (this._paused) { return false; }
};

HashingPassThroughStream.prototype.end = function(chunk) {
  if (arguments.length) { this.write(chunk); }
  this.writable = false;
  this.hashDigest = this._hash.digest('hex');
  this.emit('end');
};

HashingPassThroughStream.prototype.destroy = function() {
  this.writable = false;
};

HashingPassThroughStream.prototype.pause = function() {
  this._paused = true;
};

HashingPassThroughStream.prototype.resume = function() {
  this._paused = false;
  this.emit('drain');
};

module.exports = HashingPassThroughStream;
