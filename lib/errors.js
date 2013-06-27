var util = require('util')
  ;

function HewError(msg, constr) {
  Error.captureStackTrace(this, constr || this);
  this.message = msg || 'Error';
  this.name = this.constructor.name;
}
util.inherits(HewError, Error);
HewError.prototype.name = 'HewError';
exports.HewError = HewError;

function NotAuthenticated() { HewError.apply(this, arguments); }
util.inherits(NotAuthenticated, HewError);
NotAuthenticated.prototype.name = 'NotAuthenticated';
exports.NotAuthenticated = NotAuthenticated;

function NotProvisioned() { HewError.apply(this, arguments); }
util.inherits(NotProvisioned, HewError);
NotProvisioned.prototype.name = 'NotProvisioned';
exports.NotProvisioned = NotProvisioned;

function ServiceError() { HewError.apply(this, arguments); }
util.inherits(ServiceError, HewError);
ServiceError.prototype.name = 'ServiceError';
exports.ServiceError = ServiceError;

function NotFound() { HewError.apply(this, arguments); }
util.inherits(NotFound, HewError);
NotFound.prototype.name = 'NotFound';
exports.NotFound = NotFound;
