var transport = require('../transport')
  , NotProvisioned = require('../errors').NotProvisioned
  ;

var SERVICE_TYPE = 'identity';
var SERVICE_VERSION = '2.0';

/**
 * # Interface to HP Cloud Identity service
 *
 * @constructor
 * Constructor.
 * @param {AuthToken} authToken a valid AuthToken object
 */
function Identity(authToken) {
  this.authToken = authToken;
}

/**
 * Get a list of tenants in the current account.
 *
 * @param {Function} callback `callback(err, tenantsArray)`
 * @param {Mixed} callback.err
 * @param {Object[]} callback.tenantsArray example response:
 *
 *     [
 *         {
 *           "id": "39595655514446",
 *           "name": "Banking Tenant Services",
 *           "description": "Banking Tenant Services for TimeWarner",
 *           "enabled": true,
 *           "created": "2011-11-29T16:59:52.635Z",
 *           "updated": "2011-11-29T16:59:52.635Z"
 *         }
 *     ]
 **/
Identity.prototype.listTenants = function(callback) {
  var authToken = this.authToken;

  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = endpoint + '/tenants';
    transport.GET(uri, authToken, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body.tenants);
    });
  });
};

module.exports = Identity;
