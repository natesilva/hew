// Wrapper for the ObjectStorage service.

var transport = require('../transport')
  , NotProvisioned = require('../errors').NotProvisioned
  , url = require('url')
  ;

var SERVICE_TYPE = 'object-store';
var SERVICE_VERSION = '1.0';

// Constructor
function ObjectStorage(authToken) {
  this.authToken = authToken;
}

// ******************************************************************
// Account-level actions
// ******************************************************************

// List the available containers.
ObjectStorage.prototype.listContainers = function(callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    transport.GET(endpoint, authToken, function(err, body) {
      if (err) { return callback(err); }
      callback(null, body);
    });
  });
};

// Get user-defined account metadata.
ObjectStorage.prototype.getAllAccountMetadata = function(callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    transport.HEAD(endpoint, authToken, function(err, body, response) {
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

// Get user-defined account metadata.
ObjectStorage.prototype.getAccountMetadataValue = function(name, callback)
{
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    if (!name.toLowerCase().match(/^x-account-meta-.+/)) {
      name = 'X-Account-Meta-' + name;
    }
    name = name.toLowerCase();

    transport.HEAD(endpoint, authToken, function(err, body, response)
    {
      if (err) { return callback(err); }
      if (name in response.headers) {
        callback(null, decodeURIComponent(response.headers[name]));
      } else {
        callback();
      }
    });
  });
};

// Set user-defined account metadata.
ObjectStorage.prototype.setAccountMetadataValue = function(name, value,
  callback)
{
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    if (!name.toLowerCase().match(/^x-account-meta-.+/)) {
      name = 'X-Account-Meta-' + name;
    }

    var headers = {};
    headers[name] = encodeURIComponent(value);

    transport.headersPOST(endpoint, authToken, null, headers,
      function(err)
    {
      if (err) { return callback(err); }
      callback();
    });
  });
};

// Delete user-defined account metadata.
ObjectStorage.prototype.deleteAccountMetadataValue = function(name, callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    if (!name.toLowerCase().match(/^x-account-meta-.+/)) {
      name = 'X-Account-Meta-' + name;
    }
    name = name.slice(0, 2) + 'Remove-' + name.slice(2);

    var headers = {};
    headers[name] = '';

    transport.headersPOST(endpoint, authToken, null, headers,
      function(err)
    {
      if (err) { return callback(err); }
      callback();
    });
  });
};

// ******************************************************************
// Container-level actions
// ******************************************************************

// List the available objects for a container.
ObjectStorage.prototype.listObjects = function(cname, prefix, delimiter, path,
  callback)
{
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

  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var parts = url.parse(endpoint + '/' + encodeURIComponent(cname));
    parts.query = { format: 'json' };
    if (prefix) { parts.query.prefix = prefix; }
    if (delimiter) { parts.query.delimiter = delimiter; }
    if (path) { parts.query.path = path; }

    console.log('###', parts.query);

    transport.GET(url.format(parts), authToken, function(err, body) {
      if (err) { return callback(err); }
      callback(null, body);
    });
  });
};


module.exports = ObjectStorage;
