/**
 *  == Authentication ==
 *
 *  Authentication tokens for the HP Cloud API.
 *
 *  #### Usage
 *
 *  Create an [[AuthToken]] and pass it to the API module that you want to use.
 *  Besides the constructor, the [[AuthToken]] methods are mainly intended for
 *  internal use by other modules.
 *
 *      // example: use the Messaging module
 *      var token = new AuthToken(null, myAccessKey, mySecretKey, myTenantName);
 *      var messaging = new Messaging(token);
 **/

/** section: Authentication
 *  class AuthToken
 *
 *  Create and manage an authentication token.
 **/

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


/**
 *  new AuthToken(region, accessKey, secretKey, [tenant])
 *  - region (String): defaults to Hew.DEFAULT_REGION
 *  - accessKey (String): API access key
 *  - secretKey (String): API secret key
 *  - tenant (String): either the tenant (project) name or ID
 *
 *  Constructor. See [Authentication](#authentication).
  **/
function AuthToken(region, accessKey, secretKey, tenant) {
  this.region = region || Hew.DEFAULT_REGION;
  this.accessKey = accessKey;
  this.secretKey = secretKey;
  this.tokenId = null;
  this.expireAt = 0;
  this.serviceCatalog = null;

  if (tenant) {
    if (tenant.match(/^\d+$/)) {
      this.tenantId = tenant;
    } else {
      this.tenantName = tenant;
    }
  }
}

/* internal, related to: AuthToken#getTokenId
 * AuthToken#_authImpl(callback)
 * - callback (Function): `callback(err, tokenId)`
 *
 * Internal auth implementation.
 **/
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
  else if (this.tenantName) { json.auth.tenantName = this.tenantName; }

  var options = { json: json };

  if (!(this.region in ENDPOINTS)) {
    var msg = 'region not recognized: ' + this.region;
    return callback(new NotAuthenticated(msg));
  }
  var uri = ENDPOINTS[this.region] + 'tokens';

  var self = this;
  transport.POST(uri, null, options, function(err, response, body) {
    if (err) { return callback(err); }

    // successful authentication
    self.tokenId = body.access.token.id;
    self.expireAt = (new Date(body.access.token.expires).getTime());
    self.expireAt -= TOKEN_EXPIRE_EARLY * 1000;
    self.serviceCatalog = body.access.serviceCatalog;
    callback(null, self.tokenId);
  });
};

/**
 * AuthToken#getTokenId(callback)
 * - callback (Function): `callback(err, tokenId)`
 *
 * Get the current auth token ID.
 **/
AuthToken.prototype.getTokenId = function(callback) {
  if (this.tokenId && Date.now() < this.expireAt) {
    return callback(null, this.tokenId);
  }
  this._authImpl(callback);   // [re-]acquire the token
};

/**
 * AuthToken#getServiceEndpoint(type, versionId, callback)
 * - type (String): internal service identifier (e.g.: `identity`, `hpext:dns`)
 * - versionId (String): service version to retrieve (e.g.: `1.1`, `2.0`)
 * - callback (Function): `callback(err, endpointPublicURL)`
 *
 * Get the public endpoint URL for the given service in the current region. If
 * no matching endpoint is found, the callback receives `null`.
 **/
AuthToken.prototype.getServiceEndpoint = function(type, versionId, callback)
{
  var self = this;
  this.getTokenId(function(err) {
    if (err) { return callback(err); }

    var services = self.serviceCatalog.filter(function(s) {
      return (s.type === type);
    });
    if (!services.length) { return callback(); }

    var endpoints = services[0].endpoints.filter(function(s) {
      return (s.region === self.region && s.versionId === versionId);
    });
    if (endpoints.length) { callback(null, endpoints[0].publicURL); }
    else { callback(); }
  });
};


module.exports = AuthToken;
