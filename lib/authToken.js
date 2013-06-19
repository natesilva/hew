// Create and manage an authentication token to the HP Cloud.

var transport = require('./transport')
  , NotAuthenticated = require('./errors').NotAuthenticated
  , Hew = require('./hew')
  ;

var ENDPOINTS = {
  'region-a.geo-1':
    'https://region-a.geo-1.identity.hpcloudsvc.com:35357/v2.0/',
  'region-b.geo-1':
    'https://region-b.geo-1.identity.hpcloudsvc.com:35357/v2.0/'
};

// Avoid using newly-expired tokens: acquire a new token if we are
// within this many seconds of the current token's expiration.
var TOKEN_EXPIRE_EARLY = 10;

// Constructor. The tenant can be specified as either the tenant
// name or its ID.
function AuthToken(region, accessKey, secretKey, tenant) {
  this.region = region || Hew.DEFAULT_REGION;
  this.accessKey = accessKey;
  this.secretKey = secretKey;

  if (tenant) {
    if (tenant.match(/^\d+$/)) {
      this.tenantId = tenant;
    } else {
      this.tenantName = tenant;
    }
  }

  this.tokenId = null;
  this.expireAt = 0;
  this.serviceCatalog = null;
}

// Authenticate against HP cloud. Capture the auth token and
// service catalog metadata.
AuthToken.prototype._authImpl = function(callback) {
  var json = {
    auth: {
      apiAccessKeyCredentials: {
        accessKey: this.accessKey,
        secretKey: this.secretKey
      }
    }
  };

  if (this.tenantId) { json.auth.tenantId = this.tenantId; }
  if (this.tenantName) { json.auth.tenantName = this.tenantName; }

  if (!(this.region in ENDPOINTS)) {
    return callback(new NotAuthenticated('region not recognized: ' +
      this.region));
  }

  var that = this;
  var uri = ENDPOINTS[this.region] + 'tokens';
  transport.POST(uri, null, json, function(err, body) {
    if (err) { return callback(err); }

    // successful authentication
    that.tokenId = body.access.token.id;
    that.expireAt = (new Date(body.access.token.expires).getTime());
    that.expireAt -= TOKEN_EXPIRE_EARLY * 1000;
    that.serviceCatalog = body.access.serviceCatalog;
    callback(null, that.tokenId);
  });
};

// Get the current auth token ID. If authentication has not been
// completed yet, do it, and then return the token ID.
AuthToken.prototype.getTokenId = function(callback) {
  if (this.tokenId && Date.now() < this.expireAt) {
    return process.nextTick(callback.bind(null, null, this.tokenId));
  }

  // need to [re-]acquire the token
  this._authImpl(callback);
};

// Get the endpoint for the given service type and API version, in
// the current region.
AuthToken.prototype.getServiceEndpoint = function(type, versionId, callback)
{
  var that = this;

  // first, auth if needed
  this.getTokenId(function(err) {
    if (err) { return callback(err); }
    var services = that.serviceCatalog.filter(function(s) {
      return (s.type === type);
    });

    if (!services.length) { return callback(); }

    var endpoints = services[0].endpoints.filter(function(s) {
      return (s.region === that.region && s.versionId === versionId);
    });

    if (endpoints.length) { callback(null, endpoints[0].publicURL); }
    else { callback(); }
  });
};

module.exports = AuthToken;
