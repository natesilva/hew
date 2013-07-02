var transport = require('../../transport')
  , NotProvisioned = require('../../errors').NotProvisioned
  , url = require('url')
  , url = require('url')
  , Permissions = require('./permissions')
  , StoredObject = require('./storedObject')
  ;

var SERVICE_TYPE = 'object-store';
var SERVICE_VERSION = '1.0';

var CDN_SERVICE_TYPE = 'hpext:cdn';
var CDN_SERVICE_VERSION = '1.0';

/**
 * @class ObjectStorage.Container
 * # Interface to HP Cloud Storage containers
 *
 * The top level objects in HP Cloud {@link ObjectStorage} are Containers.
 * Within containers are stored _objects_ (files).
 *
 * Start by creating an {@link ObjectStorage} instance. Then call
 * {@link ObjectStorage#getContainer} or {@link ObjectStorage#createContainer}
 * to get a Container object.
 *
 * Use {@link ObjectStorage.Container#get} to retrieve the contents of an
 * object (file) and {@link ObjectStorage.Container#put} to upload an object
 * (file).
 *
 * Alternately, you can use {@link ObjectStorage.Container#getStream} and
 * {@link ObjectStorage.Container#putStream} to download and upload files using
 * the Node.js `Stream` interface. For large files, this may be more efficient.
 *
 * @constructor
 * Constructor.
 * @param {AuthToken} authToken a valid AuthToken object
 */
function Container(authToken, cname) {
  this.authToken = authToken;
  this.name = cname;
}

/**
 * Get the public URL of this container.
 * @param {Function} callback `callback(err, endpoint)`
 * @param {Mixed} callback.err
 * @param {String} callback.endpoint the URL
 */
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

/**
 * List the available objects in this container.
 *
 * The `prefix`, `delimiter`, and `path` arguments can be used in various
 * combinations to restrict the listing to a subset of objects in the container.
 * @param {String} [prefix] For a string value x, causes the results to be
 *     limited to object names beginning with the substring x.
 * @param {String} [delimiter] For a character c, return all the object names
 *     nested in the container (without the need for placeholder objects).
 * @param {String} [path] For a string value x, return the object names nested
 *     in the pseudo path
 * @param {Function} callback `callback(err, objectsArray)`
 * @param {Mixed} callback.err
 * @param {Object[]} callback.objectsArray example response:
 *
 *     [
 *        {
 *          "name": "test_obj_1",
 *          "hash": "4281c348eaf83e70ddce0e07221c3d28",
 *          "bytes": 14,
 *          "content_type": "application/octet-stream",
 *          "last_modified": "2009-02-03T05:26:32.612278"
 *        },
 *        {
 *          "name": "test_obj_2",
 *          "hash": "b039efe731ad111bc1b0ef221c3849d0",
 *          "bytes": 64,
 *          "content_type": "application/octet-stream",
 *          "last_modified": "2009-02-03T05:26:32.612278"
 *        }
 *     ]
 */
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

/**
 * Get container-level metadata.
 * @param {Function} callback `callback(err, metadata)`
 * @param {Mixed} callback.err
 * @param {Object} callback.metadata example response:
 *
 *     {
 *         "X-Container-Object-Count": 2,
 *         "X-Container-Meta-One": "one",
 *         "X-Container-Bytes-Used": 378
 *     }
 */
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

/**
 * Normalize a user-defined metadata item name. Allows users to specify metadata
 * names as either the name (only) or X-Container-Meta-Name.
 * @ignore
 */
Container._normalizeMetaName = function(name) {
  name = name.toLowerCase();
  if (!name.match(/^x\-container\-meta\-.+/)) {
    name = 'x-container-meta-' + name;
  }
  return name;
};

/**
 * Internal implementation to set a container-level header.
 * @param {String} name the header to set
 * @param {String} value the value to set
 * @param {Boolean} [escape=false] whether to escape (URI-encode) the value
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @ignore
 */
Container.prototype._setHeader = function(name, value, escape, callback) {
  if (typeof escape === 'function') {
    callback = escape;
    escape = false;
  }

  var that = this;
  this.getPublicUrl(function(err, endpoint) {
    if (err) { return callback(err); }
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

/**
 * Internal implementation to get the value of an account-level header.
 * @param {String} name the header to get
 * @param {Function} callback `callback(err, value)`
 * @param {Mixed} callback.err
 * @param {String} callback.value
 * @ignore
 */
Container.prototype._getHeader = function(name, callback) {
  name = name.toLowerCase();
  this.getAllMetadata(function(err, result) {
    if (err) { return callback(err); }
    if (name in result) { callback(null, decodeURIComponent(result[name])); }
    else { callback(); }
  });
};

/**
 * Get a container-level user-defined metadata value.
 * @param {String} name the name of the user-defined metadata to get
 * @param {Function} callback `callback(err, value)`
 * @param {Mixed} callback.err
 * @param {String} callback.value
 */
Container.prototype.getMetaValue = function(name, callback) {
  name = Container._normalizeMetaName(name);
  this._getHeader(name, callback);
};

/**
 * Set a container-level user-defined metadata value.
 * @param {String} name name of the value to set
 * @param {String} value the value
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
Container.prototype.setMetaValue = function(name, value, callback) {
  name = Container._normalizeMetaName(name);
  this._setHeader(name, value, true, callback);
};

/**
 * Delete a container-level user-defined metadata value.
 * @param {String} name name of the value to delete
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
Container.prototype.deleteMetaValue = function(name, callback) {
  name = Container._normalizeMetaName(name);
  name = name.slice(0, 2) + 'remove-' + name.slice(2);
  this._setHeader(name, '', true, callback);
};

/**
 * For the container synchronization feature, set the sync key (sync password).
 * The sync key must be the same on both the source and target containers.
 *
 * You must set the `syncKey` to be the same on both the source and target
 * containers, and you must call {@link ObjectStorage.Container#setSyncTarget}
 * on the source container, in order to set its target container.
 * @param {String} syncKey the sync key
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
Container.prototype.setSyncKey = function(syncKey, callback) {
  this._setHeader('x-container-sync-key', syncKey, false, callback);
};

/**
 * For the container synchronization feature, set the target container to sync
 * to. Do this on the source container.
 *
 * **Note:** Synchronization will not work unless the target container also has
 * the same `syncKey` set. See {@link ObjectStorage.Container#setSyncKey}.
 * @param {String} targetContainer the container to sync to
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
Container.prototype.setSyncTarget = function(targetContainer, callback) {
  this._setHeader('x-container-sync-to', targetContainer, false, callback);
};

/**
 * Enable container synchronization at the source container by setting the sync
 * key and target container.
 *
 * Effectively, similar to calling {@link ObjectStorage.Container#setSyncKey}
 * followed by {@link ObjectStorage.Container#setSyncTarget}.
 *
 * **Note:** Synchronization will not work unless the target container also has
 * the same `syncKey` set. See {@link ObjectStorage.Container#setSyncKey}.
 * @param {String} syncKey the sync key
 * @param {String} targetContainer the container to sync to
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
Container.prototype.setSync = function(syncKey, targetContainer, callback) {
  var that = this;
  this.setSyncKey(syncKey, function(err) {
    if (err) { return callback(err); }
    that.setSyncTarget(targetContainer, callback);
  });
};

/**
 * Enable versioning on the container. You must provide the name of a target
 * container; prior versions are stored in that container.
 * @param {String} targetContainer the target container that will store prior
 *     versions of objects for this container
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
Container.prototype.enableVersioning = function(targetContainer, callback) {
  this._setHeader('x-versions-location', targetContainer, false, callback);
};

/**
 * Disable versioning on the container.
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
Container.prototype.disableVersioning = function(callback) {
  this._setHeader('x-versions-location', '', false, callback);
};

/**
 * Convenience shortcut that removes all ACLs.
 *
 * <span style="color:red;">**Danger:** This method REMOVES all existing ACLs.
 * </span> The container will become completely private and any user-specific
 * grants will be removed.
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
Container.prototype.makePrivate = function(callback) {
  var permissions = new Permissions();
  this.setPermissions(permissions, callback);
};

/**
 * Convenience shortcut that grants world read and list access.
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
Container.prototype.makePublic = function(callback) {
  var self = this;
  self.getPermissions(function(err, permissions) {
    if (err) { return callback(err); }
    permissions.grantPublicRead();
    permissions.grantWorldListing();
    self.setPermissions(permissions, callback);
  });
};

/**
 * ACLs: Get an object representing the container's current permission settings.
 * @param {Function} callback `callback(err, permissions)`
 * @param {Mixed} callback.err
 * @param {ObjectStorage.Permissions} callback.permissions the permissions
 *     object
 * @new
 **/
Container.prototype.getPermissions = function(callback) {
  this.getAllMetadata(function(err, metaData) {
    if (err) { return callback(err); }
    var result = new Permissions(metaData['x-container-read'],
      metaData['x-container-write']);
    callback(null, result);
  });
};

/**
 * ACLs: Set the container's permissions.
 * @param {ObjectStorage.Permissions} permissions the permissions object, either
 *    newly constructed, or one obtained from an earlier call to
 *    {@link ObjectStorage.Container#getPermissions}.
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @new
 */
Container.prototype.setPermissions = function(permissions, callback) {
  var self = this;
  self._setHeader('x-container-read', permissions.getContainerReadHeader(),
    false, function(err)
  {
    if (err) { return callback(err); }
    self._setHeader('x-container-write', permissions.getContainerWriteHeader(),
      false, callback);
  });
};

/**
 * ACLs: Grant read permission on the container to the named HP Cloud user.
 * @param {String} user the user who gets read access
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @deprecated 0.0.6 use {@link ObjectStorage.Container#getPermissions} and {@link ObjectStorage.Container#setPermissions}
 */
Container.prototype.grantReadToUser = function(user, callback) {
  var self = this;
  self.getPermissions(function(err, permissions) {
    if (err) { return callback(err); }
    permissions.grantRead(user);
    self.setPermissions(permissions, callback);
  });
};

/**
 * ACLs: Revoke read permission on the container from the named HP Cloud user.
 * @param {String} user the user whose read permission is revoked
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @deprecated 0.0.6 use {@link ObjectStorage.Container#getPermissions} and {@link ObjectStorage.Container#setPermissions}
 */
Container.prototype.revokeReadFromUser = function(user, callback) {
  var self= this;
  self.getPermissions(function(err, permissions) {
    if (err) { return callback(err); }
    permissions.revokeRead(user);
    self.setPermissions(permissions, callback);
  });
};

/**
 * ACLs: Grant write permission on the container to the named HP Cloud user.
 * @param {String} user the user who gets write access
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @deprecated 0.0.6 use {@link ObjectStorage.Container#getPermissions} and {@link ObjectStorage.Container#setPermissions}
 */
Container.prototype.grantWriteToUser = function(user, callback) {
  var self = this;
  self.getPermissions(function(err, permissions) {
    if (err) { return callback(err); }
    permissions.grantWrite(user);
    self.setPermissions(permissions, callback);
  });
};

/**
 * ACLs: Revoke write permission on the container from the named HP Cloud user.
 * @param {String} user the user whose write permission is revoked
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @deprecated 0.0.6 use {@link ObjectStorage.Container#getPermissions} and {@link ObjectStorage.Container#setPermissions}
 */
Container.prototype.revokeWriteFromUser = function(user, callback) {
  var self = this;
  self.getPermissions(function(err, permissions) {
    if (err) { return callback(err); }
    permissions.revokeWrite(user);
    self.setPermissions(permissions, callback);
  });
};

/**
 * ACLs: Make the container listable by the public. Grants world list access.
 *
 * Note that list access and read access are two different things, although they
 * are usually granted in tandem. See
 * {@link ObjectStorage.Container#makePublic}.
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @deprecated 0.0.6 use {@link ObjectStorage.Container#getPermissions} and {@link ObjectStorage.Container#setPermissions}
 */
Container.prototype.grantListingToWorld = function(callback) {
  var self = this;
  self.getPermissions(function(err, permissions) {
    if (err) { return callback(err); }
    permissions.grantWorldListing();
    self.setPermissions(permissions, callback);
  });
};

/**
 * ACLs: Revoke world list access.
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @deprecated 0.0.6 use {@link ObjectStorage.Container#getPermissions} and {@link ObjectStorage.Container#setPermissions}
 */
Container.prototype.revokeListingFromWorld = function(callback) {
  var self = this;
  self.getPermissions(function(err, permissions) {
    if (err) { return callback(err); }
    permissions.revokeWorldListing();
    self.setPermissions(permissions, callback);
  });
};

/**
 * ACLs: Make the container readable (not necessarily listable) by the public.
 * Grants world read access.
 *
 * Note that list access and read access are two different things, although they
 * are usually granted in tandem. See
 * {@link ObjectStorage.Container#makePublic}.
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @deprecated 0.0.6 use {@link ObjectStorage.Container#getPermissions} and {@link ObjectStorage.Container#setPermissions}
 */
Container.prototype.grantReadToWorld = function(callback) {
  var self = this;
  self.getPermissions(function(err, permissions) {
    if (err) { return callback(err); }
    permissions.grantPublicRead();
    self.setPermissions(permissions, callback);
  });
};

/**
 * ACLs: Revoke world read access.
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @deprecated 0.0.6 use {@link ObjectStorage.Container#getPermissions} and {@link ObjectStorage.Container#setPermissions}
 */
Container.prototype.revokeReadFromWorld = function(callback) {
  var self = this;
  self.getPermissions(function(err, permissions) {
    if (err) { return callback(err); }
    permissions.revokePublicRead();
    self.setPermissions(permissions, callback);
  });
};

/**
 * ACLs: Make the container writable by the public. Grants world write access.
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @deprecated 0.0.6 use {@link ObjectStorage.Container#getPermissions} and {@link ObjectStorage.Container#setPermissions}
 */
Container.prototype.grantWriteToWorld = function(callback) {
  var self = this;
  self.getPermissions(function(err, permissions) {
    if (err) { return callback(err); }
    permissions.grantPublicWrite();
    self.setPermissions(permissions, callback);
  });
};

/**
 * ACLs: Revoke world write access.
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @deprecated 0.0.6 use {@link ObjectStorage.Container#getPermissions} and {@link ObjectStorage.Container#setPermissions}
 */
Container.prototype.revokeWriteFromWorld = function(callback) {
  var self = this;
  self.getPermissions(function(err, permissions) {
    if (err) { return callback(err); }
    permissions.revokePublicWrite();
    self.setPermissions(permissions, callback);
  });
};

/**
 * Check if CDN is enabled for this container.
 * @param {Function} callback `callback(err, isEnabled)`
 * @param {Mixed} callback.err
 * @param {Boolean} callback.isEnabled
 */
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

/**
 * Enable CDN for this container.
 * @param {Number} ttl the TTL (how long the CDN should cache items before
 *     re-requesting them from the source container)
 * @param {Function} callback `callback(err, cdnUrlsObject)`
 * @param {Mixed} callback.err
 * @param {Object} callback.cdnUrlsObject example response:
 *
 *     {
 *         cdnUri: "http://...",
 *         cdnSslUri: "https://...",
 *     }
 */
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

/**
 * Disable CDN for this container.
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
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

/**
 * Update the TTL value for the CDN. (How long the CDN should cache items before
 * re-requesting them from the source contianer.)
 * @param {Number} ttl the new TTL
 * @param {Function} callback `callback(err, cdnUrlsObject)`
 * @param {Mixed} callback.err
 * @param {Object} callback.cdnUrlsObject example response:
 *
 *     {
 *         cdnUri: "http://...",
 *         cdnSslUri: "https://...",
 *     }
 */
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

/**
 * Get the current CDN configuration.
 * @param {Function} callback `callback(err, cdnConfigObject)`
 * @param {Mixed} callback.err
 * @param {Object} callback.cdnUrlsObject example response:
 *
 *     {
 *         cdnUri: "http://...",
 *         cdnSslUri: "https://...",
 *         ttl: 3600
 *     }
 */
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

/**
 * Get an object (file) stored in the container as a pipe()-able Node.js stream.
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#getStream}.
 */
Container.prototype.getStream = function(oname, callback) {
  this.getObject(oname).getStream(callback);
};

/**
 * Get an object (file) stored in the container as a Node.js Buffer.
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#get}.
 */
Container.prototype.get = function(oname, callback) {
  this.getObject(oname).get(callback);
};

/**
 * Upload an object (file) to the container. The file contents are passed as
 * either a `Buffer` or a string.
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#put}.
 */
Container.prototype.put = function(oname, fileContents, contentType,
  callback)
{
  this.getObject(oname).put(fileContents, contentType, callback);
};

/**
 * Upload an object (file) to the container. The file contents are passed as a
 * readable Node.js `Stream`.
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#putStream}.
 */
Container.prototype.putStream = function(oname, stream, contentType, callback)
{
  this.getObject(oname).putStream(stream, contentType, callback);
};

/**
 * Delete an object (file).
 * <span style="color:red;">**Danger:** This method permanently deletes
 * data.</span>
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#deleteMe}.
 */
Container.prototype.deleteObject = function(oname, callback) {
  this.getObject(oname).deleteMe(callback);
};

/**
 * Delete an object (file).
 * <span style="color:red;">**Danger:** This method permanently deletes
 * data.</span>
 * @deprecated 0.0.6 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#deleteMe}.
 */
Container.prototype.delete = function(oname, callback) {
  this.getObject(oname).deleteMe(callback);
};

/**
 * Return a temporary URL for an object.
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#getTempUrl}.
 */
Container.prototype.getTempUrl = function(oname, ttl, method, callback) {
  this.getObject(oname).getTempUrl(ttl, method, callback);
};

/**
 * Get all object-level headers.
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#getHeaders}.
 */
Container.prototype.getObjectHeaders = function(oname, callback) {
  this.getObject(oname).getHeaders(callback);
};

/**
 * Get one object-level header value.
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#getHeader}.
 */
Container.prototype.getObjectHeader = function(oname, name, callback) {
  this.getObject(oname).getHeader(name, callback);
};

/**
 * Set an object-level header value.
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#setHeader}.
 */
Container.prototype.setObjectHeader = function(oname, name, value, escape,
  callback)
{
  this.getObject(oname).setHeader(name, value, escape, callback);
};

/**
 * Delete an object-level header.
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#deleteHeader}.
 */
Container.prototype.deleteObjectHeader = function(oname, name, callback) {
  this.getObject(oname).deleteHeader(name, callback);
};

/**
 * Get an object-level user-defined metadata value.
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#getAllMetaValues}.
 */
Container.prototype.getAllObjectMetaValues = function(oname, callback) {
  this.getObject(oname).getAllMetaValues(callback);
};

/**
 * Get an object-level user-defined metadata value.
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#getMetaValue}.
 */
Container.prototype.getObjectMetaValue = function(oname, name, callback) {
  this.getObject(oname).getMetaValue(name, callback);
};

/**
 * Set an object-level user-defined metadata value.
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#setMetaValue}.
 */
Container.prototype.setObjectMetaValue = function(oname, name, value, callback)
{
  this.getObject(oname).setMetaValue(name, value, callback);
};

/**
 * Delete an object-level user-defined metadata value.
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#deleteMetaValue}.
 */
Container.prototype.deleteObjectMetaValue = function(oname, name, callback)
{
  this.getObject(oname).deleteMetaValue(name, callback);
};

/**
 * Schedule an object to be automatically deleted after a specified amount of
 * time.
 * @deprecated 0.0.7 use {@link ObjectStorage.Container#getObject} followed by {@link ObjectStorage.StoredObject#selfDestruct}.
 */
Container.prototype.selfDestruct = function(oname, when, callback) {
  this.getObject(oname).selfDestruct(when, callback);
};

/**
 * Create a {@link ObjectStorage.StoredObject} for this container.
 *
 * If the `name` is that of an existing object, the resulting
 * {@link ObjectStorage.StoredObject StoredObject} references that object and
 * can be used to read and write it.
 *
 * If the `name` is that of an object that doesn't exist yet, it **will not be
 * created** until you call {@link ObjectStorage.StoredObject#put} or
 * {@link ObjectStorage.StoredObject#putStream} to upload the file contents.
 * @param {String} oname the object name
 * @returns {ObjectStorage.StoredObject}
 * @new
 */
Container.prototype.getObject = function(oname) {
  return new StoredObject(this.authToken, this.name, oname);
};

module.exports = Container;
