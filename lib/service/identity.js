// Wrapper for (parts of) the Identity service.

var transport = require('../transport')
  , NotProvisioned = require('../errors').NotProvisioned
  ;

var SERVICE_TYPE = 'identity';
var SERVICE_VERSION = '2.0';

// Constructor
function Identity(authToken) {
  this.authToken = authToken;
}

// Get a list of tenants in the current account.
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
