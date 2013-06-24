// An ObjectStorage container.

var transport = require('../../transport')
  , NotProvisioned = require('../../errors').NotProvisioned
  , url = require('url')
  , AclList = require('./aclList')
  , crypto = require('crypto')
  , HewError = require('../../errors').HewError
  ;

var SERVICE_TYPE = 'object-store';
var SERVICE_VERSION = '1.0';

var CDN_SERVICE_TYPE = 'hpext:cdn';
var CDN_SERVICE_VERSION = '1.0';

// Constructor
function Container(authToken, cname) {
  this.authToken = authToken;
  this.name = cname;
}

// Get the public URL of this container
Container.prototype.getPublicUrl = function(callback) {
  var that = this;
  this.authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }
    if (endpoint[endpoint.length -1] !== '/') { endpoint += '/'; }
    endpoint += encodeURIComponent(that.name);
    callback(null, endpoint);
  });
};

// List the available objects
Container.prototype.listObjects = function(prefix, delimiter, path, callback) {
  var that = this;

  if (typeof prefix === 'function') {
    callback = prefix;
    prefix = null;
  }

  if (typeof delimiter === 'function') {
    callback = delimiter;
    delimiter = null;
  }

  if (typeof path === 'function') {
    callback = path;
    path = null;
  }

  this.getPublicUrl(function(err, endpoint) {
    if (err) { return callback(err); }
    var parts = url.parse(endpoint);
    parts.query = { format: 'json' };
    if (prefix) { parts.query.prefix = prefix; }
    if (delimiter) { parts.query.delimiter = delimiter; }
    if (path) { parts.query.path = path; }

    transport.GET(url.format(parts), that.authToken,
      function(err, response, body)
    {
      if (err) { return callback(err); }
      callback(null, body);
    });
  });
};

// Get all container metadata
Container.prototype.getAllMetadata = function(callback) {
  var that = this;
  this.getPublicUrl(function(err, endpoint) {
    if (err) { return callback(err); }
    transport.HEAD(endpoint, that.authToken, function(err, response) {
      if (err) { return callback(err); }
      var result = {};
      Object.keys(response.headers).forEach(function(h) {
        if (h.match(/^x\-container\-/)) { result[h] = response.headers[h]; }
      });
      callback(null, result);
    });
  });
};

// Normalize a user-defined metadata item name
function normalizeMetaName(name) {
  name = name.toLowerCase();
  if (!name.match(/^x\-container\-meta\-.+/)) {
    name = 'x-container-meta-' + name;
  }
  return name;
}

// Set a header on the container
Container.prototype._setHeader = function(name, value, escape, callback) {
  if (typeof escape === 'function') {
    callback = escape;
    escape = true;
  }

  var that = this;
  this.getPublicUrl(function(err, endpoint) {
    var options = { headers: {} };
    if (escape) {
      options.headers[name] = encodeURIComponent(value);
    } else {
      options.headers[name] = value;
    }

    transport.POST(endpoint, that.authToken, options, function(err)
    {
      if (err) { return callback(err); }
      callback();
    });
  });
};

// Get a header value
Container.prototype._getHeader = function(name, callback) {
  name = name.toLowerCase();
  this.getAllMetadata(function(err, result) {
    if (err) { return callback(err); }
    if (name in result) { callback(null, decodeURIComponent(result[name])); }
    else { callback(); }
  });
};

// Get user-defined metadata value
Container.prototype.getMetaValue = function(name, callback) {
  name = normalizeMetaName(name);
  this._getHeader(name, callback);
};

// Set user-defined metadata value
Container.prototype.setMetaValue = function(name, value, callback) {
  name = normalizeMetaName(name);
  this._setHeader(name, value, callback);
};

// Delete user-defined metadata value
Container.prototype.deleteMetaValue = function(name, callback) {
  name = normalizeMetaName(name);
  name = name.slice(0, 2) + 'remove-' + name.slice(2);
  this._setHeader(name, '', callback);
};

// Set the sync key (sync password; must be the same on both
// source and target sync containers)
Container.prototype.setSyncKey = function(syncKey, callback) {
  this._setHeader('x-container-sync-key', syncKey, callback);
};

// Set the target container to sync to (set this value at the
// source container).
Container.prototype.setSyncTarget = function(targetContainer, callback) {
  this._setHeader('x-container-sync-to', targetContainer, false, callback);
};

// Convenience function to set sync key and target container all at
// once.
Container.prototype.setSync = function(syncKey, targetContainer, callback) {
  var that = this;
  this.setSyncKey(syncKey, function(err) {
    if (err) { return callback(err); }
    that.setSyncTarget(targetContainer, callback);
  });
};

// Enable versioning on the container. Prior versions are stored in
// the named container.
Container.prototype.enableVersioning = function(targetContainer, callback) {
  this._setHeader('x-versions-location', targetContainer, false, callback);
};

// Disable versioning.
Container.prototype.disableVersioning = function(callback) {
  this._setHeader('x-versions-location', '', false, callback);
};

// ACLs: Make the container private. Removes all ACLs.
Container.prototype.makePrivate = function(callback) {
  var that = this;
  this._setHeader('x-container-read', '', function(err) {
    if (err) { return callback(err); }
    that._setHeader('x-container-write', '', false, callback);
  });
};

// ACLs: Make the container public. Grants world read and list
// access.
Container.prototype.makePublic = function(callback) {
  var that = this;
  this.grantListingToWorld(function(err) {
    if (err) { return callback(err); }
    that.grantReadToWorld(callback);
  });
};

// ACLs: Grant read permission to the given user
Container.prototype.grantReadToUser = function(user, callback) {
  var that = this;
  this._getHeader('x-container-read', function(err, value) {
    if (err) { return callback(err); }
    var acls = new AclList(value);
    acls.setUserRights(user, '*');
    that._setHeader('x-container-read', acls.toHeaderString(), false, callback);
  });
};

// ACLs: Revoke user read permissions
Container.prototype.revokeReadFromUser = function(user, callback) {
  var that = this;
  this._getHeader('x-container-read', function(err, value) {
    if (err) { return callback(err); }
    var acls = new AclList(value);
    acls.deleteUser(user);
    that._setHeader('x-container-read', acls.toHeaderString(), false, callback);
  });
};

// ACLs: Grant write permission to the given user
Container.prototype.grantWriteToUser = function(user, callback) {
  var that = this;
  this._getHeader('x-container-write', function(err, value) {
    if (err) { return callback(err); }
    var acls = new AclList(value);
    acls.setUserRights(user, '*');
    that._setHeader('x-container-write', acls.toHeaderString(), false,
      callback);
  });
};

// ACLs: Revoke user write permissions
Container.prototype.revokeWriteFromUser = function(user, callback) {
  var that = this;
  this._getHeader('x-container-write', function(err, value) {
    if (err) { return callback(err); }
    var acls = new AclList(value);
    acls.deleteUser(user);
    that._setHeader('x-container-write', acls.toHeaderString(), false,
      callback);
  });
};

// ACLs: Grant world listing access
Container.prototype.grantListingToWorld = function(callback) {
  var that = this;
  this._getHeader('x-container-read', function(err, value) {
    if (err) { return callback(err); }
    var acls = new AclList(value);
    acls.allowWorldListing();
    that._setHeader('x-container-read', acls.toHeaderString(), false,
      callback);
  });
};

// ACLs: Revoke world listing access
Container.prototype.revokeListingFromWorld = function(callback) {
  var that = this;
  this._getHeader('x-container-read', function(err, value) {
    if (err) { return callback(err); }
    var acls = new AclList(value);
    acls.denyWorldListing();
    that._setHeader('x-container-read', acls.toHeaderString(), false,
      callback);
  });
};

// ACLs: Grant world read access
Container.prototype.grantReadToWorld = function(callback) {
  var that = this;
  this._getHeader('x-container-read', function(err, value) {
    if (err) { return callback(err); }
    var acls = new AclList(value);
    acls.setUserRights('*', '.r');
    that._setHeader('x-container-read', acls.toHeaderString(), false,
      callback);
  });
};

// ACLs: Revoke world read access
Container.prototype.revokeReadFromWorld = function(callback) {
  var that = this;
  this._getHeader('x-container-read', function(err, value) {
    if (err) { return callback(err); }
    var acls = new AclList(value);
    acls.deleteUser('*');
    that._setHeader('x-container-read', acls.toHeaderString(), false,
      callback);
  });
};

// ACLs: Grant world write access
Container.prototype.grantWriteToWorld = function(callback) {
  var that = this;
  this._getHeader('x-container-write', function(err, value) {
    if (err) { return callback(err); }
    var acls = new AclList(value);
    acls.setUserRights('*', '.r');
    that._setHeader('x-container-write', acls.toHeaderString(), false,
      callback);
  });
};

// ACLs: Revoke world write access
Container.prototype.revokeWriteFromWorld = function(callback) {
  var that = this;
  this._getHeader('x-container-write', function(err, value) {
    if (err) { return callback(err); }
    var acls = new AclList(value);
    acls.deleteUser('*');
    that._setHeader('x-container-write', acls.toHeaderString(), false,
      callback);
  });
};

// Check if CDN is enabled for this container
Container.prototype.isCdnEnabled = function(callback) {
  var that = this;
  this.authToken.getServiceEndpoint(CDN_SERVICE_TYPE, CDN_SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }
    transport.GET(endpoint, that.authToken, function(err, response, body) {
      if (err) { return callback(err); }
      var cdnContainers = body.trim().split('\n');
      callback(null, cdnContainers.indexOf(that.name) !== -1);
    });
  });
};

// Enable CDN for this container
Container.prototype.enableCdn = function(ttl, callback) {
  var that = this;

  if (typeof ttl === 'function') {
    callback = ttl;
    ttl = null;
  }
  ttl = ttl || 86400;

  this.authToken.getServiceEndpoint(CDN_SERVICE_TYPE, CDN_SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }
    if (endpoint[endpoint.length -1] !== '/') { endpoint += '/'; }

    var options = { headers: {} };
    options.headers['X-TTL'] = ttl;

    var uri = endpoint + that.name;
    transport.PUT(uri, that.authToken, options, function(err, response) {
      if (err) { return callback(err); }
      var result = {
        cdnUri: response.headers['x-cdn-uri'],
        cdnSslUri: response.headers['x-cdn-ssl-uri']
      };
      callback(null, result);
    });
  });
};

// Disable CDN for this container
Container.prototype.disableCdn = function(callback) {
  var that = this;

  this.authToken.getServiceEndpoint(CDN_SERVICE_TYPE, CDN_SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }
    if (endpoint[endpoint.length -1] !== '/') { endpoint += '/'; }

    var uri = endpoint + that.name;
    transport.DELETE(uri, that.authToken, function(err) {
      if (err) { return callback(err); }
      callback();
    });
  });
};

// Update CDN TTL
Container.prototype.updateCdnTtl = function(ttl, callback) {
  var that = this;
  this.authToken.getServiceEndpoint(CDN_SERVICE_TYPE, CDN_SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }
    if (endpoint[endpoint.length -1] !== '/') { endpoint += '/'; }

    var options = { headers: {} };
    options.headers['X-TTL'] = ttl;

    var uri = endpoint + that.name;
    transport.POST(uri, that.authToken, options, function(err, response)
    {
      if (err) { return callback(err); }
      var result = {
        cdnUri: response.headers['x-cdn-uri'],
        cdnSslUri: response.headers['x-cdn-ssl-uri']
      };
      callback(null, result);
    });
  });
};

// Get the current CDN configuration
Container.prototype.getCdnConfig = function(callback) {
  var that = this;
  this.authToken.getServiceEndpoint(CDN_SERVICE_TYPE, CDN_SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }
    if (endpoint[endpoint.length -1] !== '/') { endpoint += '/'; }

    var uri = endpoint + that.name;
    transport.HEAD(uri, that.authToken, function(err, response)
    {
      if (err) { return callback(err); }
      var result = {
        cdnUri: response.headers['x-cdn-uri'],
        cdnSslUri: response.headers['x-cdn-ssl-uri'],
        ttl: parseInt(response.headers['x-ttl'], 10)
      };
      callback(null, result);
    });
  });
};

// get an object (file) as a pipe()-able stream
Container.prototype.getStream = function(oname, callback) {
  var that = this;
  this.getPublicUrl(function(err, endpoint) {
    if (err) { return callback(err); }

    var options = { stream: true };

    endpoint += '/' + encodeURI(oname);
    transport.GET(endpoint, that.authToken, options, function(err, stream)
    {
      if (err) { return callback(err); }
      callback(null, stream);
    });
  });
};

// get an object (file) as a Buffer
Container.prototype.get = function(oname, callback) {
  var that = this;
  this.getPublicUrl(function(err, endpoint) {
    if (err) { return callback(err); }

    var options = { buffer: true };

    endpoint += '/' + encodeURI(oname);
    transport.GET(endpoint, that.authToken, options,
      function(err, response, body)
    {
      if (err) { return callback(err); }
      callback(null, response.headers, body);
    });
  });
};

// upload a file (passed as a Buffer or string)
Container.prototype.put = function(oname, fileContents, contentType,
  callback)
{
  if (typeof contentType === 'function') {
    callback = contentType;
    contentType = null;
  }

  if (!Buffer.isBuffer(fileContents)) {
    fileContents = new Buffer(fileContents);
  }

  var that = this;
  this.getPublicUrl(function(err, endpoint) {
    if (err) { return callback(err); }
    var options = { body: fileContents, headers: {} };

    options.headers['Content-Length'] = fileContents.length;
    if (contentType) { options.headers['Content-Type'] = contentType; }

    var md5sum = crypto.createHash('md5');
    md5sum.update(fileContents);
    var md5digest = md5sum.digest('hex');
    options.headers.ETag = md5digest;

    endpoint += '/' + encodeURI(oname);
    transport.PUT(endpoint, that.authToken, options, function(err, response) {
      if (err) { return callback(err); }
      if (response.headers.etag &&
        md5digest.toLowerCase() !== response.headers.etag.toLowerCase())
      {
        var e = new HewError('checksum mismatch: possible corruption during ' +
          'file upload');
        return callback(e);
      }
      callback();
    });

  });
};

// upload a file (passed as a stream)
Container.prototype.putStream = function(oname, stream, contentType,
  callback)
{
  if (typeof contentType === 'function') {
    callback = contentType;
    contentType = null;
  }

  var that = this;
  this.getPublicUrl(function(err, endpoint) {
    if (err) { return callback(err); }

    var options = { stream: true, headers: {}, input: stream };
    if (contentType) { options.headers['Content-Type'] = contentType; }

    endpoint += '/' + encodeURI(oname);
    transport.PUT(endpoint, that.authToken, options, function(err, response) {
      if (err) { return callback(err); }

      var md5sum = crypto.createHash('md5');

      // response is a stream
      // stream.pipe(response).pipe(md5sum);

      response.resume();
      stream.on('data', function(d) {
        response.write(d);
        md5sum.write(d);
      });

      stream.on('end', function() {
        response.end();
        md5sum.end();
      });

      // // stream.pipe(hasher).pipe(response);
      // response.on('error', callback);
      // stream.on('error', callback);
      // response.on('response', function(response) {
      //   console.log('###', response.headers);
      //   // console.log('### md5sum:', md5sum.digest('hex'));
      //   callback();
      // });

      response.on('end', function() {
        console.log('ended');
        console.log('### md5sum:', md5sum.read());
        callback();
      });
    });

  });
};


module.exports = Container;
