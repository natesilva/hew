var transport = require('./transport')
  , NotAuthenticated = require('./errors').NotAuthenticated
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
 * # HP Cloud Authentication
 *
 * This class handles authentication on behalf of the service classes in the Hew
 * library.
 *
 * You’ll always need to create an instance of `AuthToken`, which you can then
 * pass to constructors of service classes.
 *
 * Other than the constructor, most of the methods in this class are meant for
 * internal use by the service classes.
 *
 *     // create an auth token
 *     var myToken = new Hew.AuthToken(null, accessKey, secretKey, tenant);
 *
 *     var messaging = new Hew.Messaging(myToken);
 *     // (do stuff with the messaging service)
 *
 *     var dns = new Hew.DNS(myToken);
 *     // (do stuff with the DNS service)
 *
 *     //  etc.
 *
 * @constructor
 * Constructor.
 * @param {String | null} region defaults to AuthToken.DEFAULT_REGION
 * @param {String} accessKey
 * @param {String} secretKey
 * @param {String} [tenant] either the tenant name or its ID (also known as
 *     “project name” and “project ID” in some parts of the HP Cloud UI)
 */
function AuthToken(region, accessKey, secretKey, tenant) {
  this.region = region || AuthToken.DEFAULT_REGION;
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

/**
 * @property {String} [="region-a.geo-1"]
 * Default region for new connections.
 * @readonly
 */
AuthToken.DEFAULT_REGION = 'region-a.geo-1';

/**
 * Internal auth implementation.
 * @param {Function} callback `callback(err, tokenId)`
 * @param {Mixed} callback.err
 * @param {String} callback.tokenId
 * @ignore
 */
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
 * Get the current auth token ID.
 * @param {Function} callback `callback(err, tokenId)`
 * @param {Mixed} callback.err
 * @param {String} callback.tokenId
 */
AuthToken.prototype.getTokenId = function(callback) {
  if (this.tokenId && Date.now() < this.expireAt) {
    return callback(null, this.tokenId);
  }
  this._authImpl(callback);   // [re-]acquire the token
};

/**
 * Get the public endpoint URL for the given service in the current region.
 * @param {String} type internal service identifier, such as `identity` or
 *     `hpext:dns`
 * @param {String} versionId service version to retrieve, such as `1.1` or `2.0`
 * @param {Function} callback `callback(err, endpointPublicURL)`
 * @param {Mixed} callback.err
 * @param {String} callback.endpointPublicURL the URL of the service, or `null`
 *     if no endpoint could be found
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
