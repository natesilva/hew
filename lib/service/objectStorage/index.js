// Wrapper for the ObjectStorage service.

var transport = require('../../transport')
  , NotProvisioned = require('../../errors').NotProvisioned
  , NotFound = require('../../errors').NotFound
  , Container = require('./container')
  ;

var SERVICE_TYPE = 'object-store';
var SERVICE_VERSION = '1.0';

// Constructor
function ObjectStorage(authToken) {
  this.authToken = authToken;
}

// ******************************************************************
// ObjectStorage-level actions
// ******************************************************************

// List the available containers.
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

// Get all ObjectStorage metadata.
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
        if (h.match(/^x\-ObjectStorage\-/)) {
          result[h] = response.headers[h];
        }
      });
      callback(null, result);
    });
  });
};

// Normalize a user-defined metadata item name
function normalizeMetaName(name) {
  name = name.toLowerCase();
  if (!name.match(/^x\-ObjectStorage\-meta\-.+/)) {
    name = 'x-ObjectStorage-meta-' + name;
  }
  return name;
}

// Set a header on the container
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

// Get a header value
ObjectStorage.prototype._getHeader = function(name, callback) {
  name = name.toLowerCase();
  this.getAllMetadata(function(err, result) {
    if (err) { return callback(err); }
    if (name in result) { callback(null, decodeURIComponent(result[name])); }
    else { callback(); }
  });
};

// Get user-defined metadata value
ObjectStorage.prototype.getMetaValue = function(name, callback) {
  name = normalizeMetaName(name);
  this._getHeader(name, callback);
};

// Set user-defined metadata value
ObjectStorage.prototype.setMetaValue = function(name, value, callback) {
  name = normalizeMetaName(name);
  this._setHeader(name, value, callback);
};

// Delete user-defined metadata value
ObjectStorage.prototype.deleteMetaValue = function(name, callback) {
  name = normalizeMetaName(name);
  name = name.slice(0, 2) + 'remove-' + name.slice(2);
  this._setHeader(name, '', callback);
};

// Get a container
ObjectStorage.prototype.getContainer = function(cname, callback) {
  var that = this;
  this.listContainers(function(err, containers) {
    if (err) { return callback(err); }
    var found = containers.some(function(el) { return (el.name === cname); });
    if (!found) { return callback(new NotFound('container ' + cname)); }
    return callback(null, new Container(that.authToken, cname));
  });
};

// Create a container
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
      callback(null, new Container(that.authToken, cname));
    });
  });
};

// Delete a container
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


module.exports = ObjectStorage;
