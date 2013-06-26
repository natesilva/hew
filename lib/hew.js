/**
 *  Hew
 *
 *  Global constants.
 **/

/**
 *  Hew.DEFAULT_REGION = 'region-a.geo-1'
 *
 *  The default region used for new connections.
 **/
exports.DEFAULT_REGION = 'region-a.geo-1';

exports.Error = require('./errors').HewError;
exports.NotAuthenticated = require('./errors').NotAuthenticated;
exports.NotProvisioned = require('./errors').NotProvisioned;
exports.ServiceError = require('./errors').ServiceError;

exports.AuthToken = require('./authToken');

exports.Identity = require('./service/identity');
exports.Messaging = require('./service/messaging');
exports.DNS = require('./service/dns');
exports.ObjectStorage = require('./service/objectStorage');
