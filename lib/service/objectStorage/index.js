// Wrapper for the ObjectStorage service.

var transport = require('../../transport')
  , NotProvisioned = require('../../errors').NotProvisioned
  , NotFound = require('../../errors').NotFound
  ;

var SERVICE_TYPE = 'object-store';
var SERVICE_VERSION = '1.0';

/**
 * # Interface to HP Cloud Storage and CDN
 *
 * The top level objects in HP Cloud Storage are
 * {@link ObjectStorage.Container Containers}. Within containers are stored
 * _objects_ (files).
 *
 * Access-control lists (ACLs) can be applied at the container level, allowing
 * containers to be completely private, completely public, or private-but-shared
 * with specific HP Cloud tenants.
 *
 * Object-level (per-file) ACLs are not supported by HP Cloud’s API.
 *
 * HP’s Content Distribution Network (CDN) can also be enabled at the container
 * level. Note that enabling the CDN clears any previous ACLs and makes the
 * container public.
 *
 * @constructor
 * Constructor.
 * @param {AuthToken} authToken a valid AuthToken object
 */
function ObjectStorage(authToken) {
  this.authToken = authToken;
}

/**
 * List the available containers.
 * @param {Function} callback `callback(err, containerDataArray)`
 * @param {Mixed} callback.err
 * @param {Object[]} callback.containerDataArray example response:
 *
 *     [
 *         {"name":"test_container_1", "count":2, "bytes":78},
 *         {"name":"test_container_2", "count":1, "bytes":17}
 *     ]
 */
ObjectStorage.prototype.listContainers = function(callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    transport.GET(endpoint, authToken, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body);
    });
  });
};

/**
 * Get all account-level metadata associated with the object storage service for
 * the current account.
 *
 * This includes container, object, and byte counts, as well as any user-defined
 * metadata that has been associated with the account.
 * @param {Function} callback `callback(err, metadataArray)`
 * @param {Mixed} callback.err
 * @param {Object} callback.metadataArray example response:
 *
 *     {
 *         "X-Account-Object-Count": 21280,
 *         "X-Account-Bytes-Used": 3044371826,
 *         "X-Account-Container-Count": 2
 *     }
 */
ObjectStorage.prototype.getAllMetadata = function(callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    transport.HEAD(endpoint, authToken, function(err, response) {
      if (err) { return callback(err); }
      var result = {};
      Object.keys(response.headers).forEach(function(h) {
        if (h.match(/^x\-account\-/)) {
          result[h] = response.headers[h];
        }
      });
      callback(null, result);
    });
  });
};

/**
 * Normalize a user-defined metadata item name. Allows users to specify metadata
 * names as either the name (only) or X-Account-Meta-Name.
 * @ignore
 */
function normalizeMetaName(name) {
  name = name.toLowerCase();
  if (!name.match(/^x\-account\-meta\-.+/)) {
    name = 'x-account-meta-' + name;
  }
  return name;
}

/**
 * Internal implementation to set an account-level header.
 * @param {String} name the header to set
 * @param {String} value the value to set
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @ignore
 */
ObjectStorage.prototype._setHeader = function(name, value, callback) {
  var that = this;
  this.authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var options = { headers: {} };
    options.headers[name] = encodeURIComponent(value);

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
ObjectStorage.prototype._getHeader = function(name, callback) {
  name = name.toLowerCase();
  this.getAllMetadata(function(err, result) {
    if (err) { return callback(err); }
    if (name in result) { callback(null, decodeURIComponent(result[name])); }
    else { callback(); }
  });
};

/**
 * Get an account-level user-defined metadata value.
 * @param {String} name the name of the user-defined metadata to get
 * @param {Function} callback `callback(err, value)`
 * @param {Mixed} callback.err
 * @param {String} callback.value
 */
ObjectStorage.prototype.getMetaValue = function(name, callback) {
  name = normalizeMetaName(name);
  this._getHeader(name, callback);
};

/**
 * Set an account-level user-defined metadata value.
 * @param {String} name name of the value to set
 * @param {String} value the value
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
ObjectStorage.prototype.setMetaValue = function(name, value, callback) {
  name = normalizeMetaName(name);
  this._setHeader(name, value, callback);
};

/**
 * Delete an account-level user-defined metadata value.
 * @param {String} name name of the value to delete
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
ObjectStorage.prototype.deleteMetaValue = function(name, callback) {
  name = normalizeMetaName(name);
  name = name.slice(0, 2) + 'remove-' + name.slice(2);
  this._setHeader(name, '', callback);
};

/**
 * Get a container.
 * @param {String} cname the container name
 * @param {Function} callback `callback(err, container)`
 * @param {Mixed} callback.err
 * @param {ObjectStorage.Container} callback.container an
 *     {@link ObjectStorage.Container} object
 */
ObjectStorage.prototype.getContainer = function(cname, callback) {
  var that = this;
  this.listContainers(function(err, containers) {
    if (err) { return callback(err); }
    var found = containers.some(function(el) { return (el.name === cname); });
    if (!found) { return callback(new NotFound('container ' + cname)); }
    return callback(null, new ObjectStorage.Container(that.authToken, cname));
  });
};

/**
 * Create a container.
 * @param {String} cname the container name
 * @param {Function} callback `callback(err, container)`
 * @param {Mixed} callback.err
 * @param {ObjectStorage.Container} callback.container an
 *     {@link ObjectStorage.Container} object
 */
ObjectStorage.prototype.createContainer = function(cname, callback) {
  var that = this;
  this.authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = endpoint + '/' + encodeURIComponent(cname);
    transport.PUT(uri, that.authToken, function(err) {
      if (err) { return callback(err); }
      callback(null, new ObjectStorage.Container(that.authToken, cname));
    });
  });
};

/**
 * Delete a container. A container cannot be deleted if it contains any objects.
 *
 * <span style="color:red;">**Danger:** This method permanently deletes
 * data.</span>
 * @param {String} cname the container name
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
ObjectStorage.prototype.deleteContainer = function(cname, callback) {
  var that = this;
  this.authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = endpoint + '/' + encodeURIComponent(cname);
    transport.DELETE(uri, that.authToken, function(err) {
      if (err) { return callback(err); }
      callback();
    });
  });
};

/**
 * Delete a container **and all its contents**. Dangerous!
 *
 * <span style="color:red;">**Danger:** This method permanently deletes
 * data.</span>
 * @param {String} cname the container name
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
ObjectStorage.prototype.deleteContainerAndAllContents =
  function(cname, callback)
{
  var self = this;

  self.getContainer(cname, function(err, container) {
    if (err) { return callback(err); }

    container.listObjects(function(err, containerItems) {

      var deleteItems = function(items, index, cb) {
        if (index >= items.length) { return cb(); }
        container.delete(items[index].name, function(err) {
          if (err) { return cb(err); }
          deleteItems(items, index + 1, cb);
        });
      };

      deleteItems(containerItems, 0, function(err) {
        if (err) { return callback(err); }
        self.deleteContainer(cname, callback);
      })
    });
  });
};

// ******************************************************************
// Other classes to attach to this one.
// ******************************************************************

ObjectStorage.Container = require('./container');

// export it
module.exports = ObjectStorage;
