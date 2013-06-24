// Wrapper for the DNS service.

var transport = require('../transport')
  , NotProvisioned = require('../errors').NotProvisioned
  , ServiceError = require('../errors').ServiceError
  , url = require('url')
  ;

var SERVICE_TYPE = 'hpext:dns';
var SERVICE_VERSION = '1';

function DNS(authToken) {
  this.authToken = authToken;
  this.domainMap = null;
}

// We hide the domain IDs as an implementation detail and allow
// users to specify the human-readable domain name. To do this, we
// need a map from domain names to their corresponding IDs.
DNS.prototype._getDomainMap = function(callback) {
  if (this.domainMap) {
    return process.nextTick(callback.bind(null, null, this.domainMap));
  }

  this.listDomains(function(err, domains) {
    if (err) { return callback(err); }
    var result = {};
    domains.forEach(function(d) {
      result[d.name] = d.id;
    });
    this.domainMap = result;
    callback(null, result);
  });
};

// Wrapper for target methods that expect a domain ID. The target
// should be a member method that accepts a domain ID as its first
// argument and a callback as its last argument.
//
// Call this wrapper with the same arguments you would pass to the
// target method, but with a domain name as the first argument
// instead of a domain ID. The domain name will be converted to its
// corresponding ID and the target will be called.
//
// If no corresponding ID can be found, the callback (not the
// target) will be invoked with an error.
DNS.prototype._callWithDomainId = function(target, args)
{
  if (!Array.isArray(args)) { args = Array.prototype.slice.call(args); }
  var callback = args[args.length - 1];
  if (typeof callback !== 'function') { callback = function() {}; }

  var dname = args[0];
  if (dname.slice(-1) !== '.') { dname += '.'; }

  var that = this;
  that._getDomainMap(function(err, dmap) {
    if (err) { return callback(err); }
    var did = dmap[dname];
    if (!did) {
      var e = new ServiceError('domain name "' + dname + '" not found');
      return callback(e);
    }
    args[0] = did;
    target.apply(that, args);
  });
};

// Get a list of domains in this account.
DNS.prototype.listDomains = function(callback) {
  var authToken = this.authToken;

  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = url.resolve(endpoint, 'domains');
    transport.GET(uri, authToken, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body.domains);
    });
  });
};

// Get the metadata for a domain.
DNS.prototype.getDomainById = function(did, callback) {
  var authToken = this.authToken;

  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = url.resolve(endpoint, 'domains/' + did);
    transport.GET(uri, authToken, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body);
    });
  });
};

// Create a domain. email is required; ttl is optional.
DNS.prototype.createDomain = function(dname, email, ttl, callback) {
  var authToken = this.authToken;

  if (dname.slice(-1) !== '.') { dname += '.'; }

  if (typeof ttl === 'function') {
    callback = ttl;
    ttl = null;
  }

  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var json = {
      name: dname,
      email: email
    };
    if (ttl) { json.ttl = ttl; }

    var options = { json: json };
    var uri = url.resolve(endpoint, 'domains');
    transport.POST(uri, authToken, options, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body);
    });
  });
};

// Delete a domain.
DNS.prototype.deleteDomainById = function(did, callback) {
  var authToken = this.authToken;

  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = url.resolve(endpoint, 'domains/' + did);
    transport.DELETE(uri, authToken, function(err) {
      if (err) { return callback(err); }
      callback(null);
    });
  });
};

// Update a domain. email is required; ttl is optional.
DNS.prototype.updateDomainById = function(did, email, ttl, callback) {
  var authToken = this.authToken;

  if (typeof ttl === 'function') {
    callback = ttl;
    ttl = null;
  }

  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var json = { email: email };
    if (ttl) { json.ttl = ttl; }

    var options = { json: json }
    var uri = url.resolve(endpoint, 'domains/' + did);
    transport.PUT(uri, authToken, options, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body);
    });
  });
};

// Return an array of the assigned nameservers for the given domain.
DNS.prototype.getServersById = function(did, callback) {
  var authToken = this.authToken;

  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = url.resolve(endpoint, 'domains/' + did + '/servers');
    transport.GET(uri, authToken, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body.servers.map(function(s) { return s.name; }));
    });
  });
};

// List all DNS records in a domain
DNS.prototype.listRecordsByDomainId = function(did, callback) {
  var authToken = this.authToken;

  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = url.resolve(endpoint, 'domains/' + did + '/records');
    transport.GET(uri, authToken, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body.records);
    });
  });
};

// Create a DNS record
DNS.prototype.createRecordByDomainId = function(did, recordName, type, data,
  ttl, priority, callback)
{
  var authToken = this.authToken;

  if (typeof ttl === 'function') {
    callback = ttl;
    ttl = null;
  }

  if (typeof priority === 'function') {
    callback = priority;
    priority = null;
  }

  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var json = {
      name: recordName,
      type: type,
      data: data,
      priority: priority
    };

    if (ttl) { json.ttl = ttl; }

    var options = { json: json };
    var uri = url.resolve(endpoint, 'domains/' + did + '/records');
    transport.POST(uri, authToken, options, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body);
    });
  });
};

// Get a DNS record
DNS.prototype.getRecordByDomainId = function(did, recordId, callback) {
  var authToken = this.authToken;

  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = url.resolve(endpoint, 'domains/' + did + '/records/' +
      encodeURIComponent(recordId));
    transport.GET(uri, authToken, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body);
    });
  });
};

// Find all DNS records with the given name and type.
DNS.prototype.findRecordsByDomainId = function(did, recordName, type, callback)
{
  this.listRecordsByDomainId(did, function(err, all) {
    if (err) { return callback(err); }
    var result = all.filter(function(r) {
      return (r.type === type && r.name === recordName);
    });
    callback(null, result);
  });
};

// Delete the given DNS record.
DNS.prototype.deleteRecordByDomainId = function(did, recordId, callback)
{
  var authToken = this.authToken;

  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = url.resolve(endpoint, 'domains/' + did + '/records/' +
      encodeURIComponent(recordId));
    transport.DELETE(uri, authToken, function(err) {
      if (err) { return callback(err); }
      callback(null);
    });
  });
};

// Update a DNS record
DNS.prototype.updateRecordByDomainId = function(did, recordId, newValues,
  callback)
{
  var authToken = this.authToken;

  this.getRecordByDomainId(did, recordId, function(err, record) {
    if (err) { return callback(err); }

    if ('name' in newValues) { record.name = newValues.name; }
    if ('data' in newValues) { record.data = newValues.data; }
    if ('ttl' in newValues) { record.ttl = newValues.ttl; }
    if ('priority' in newValues) { record.priority = newValues.priority; }

    authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
      function(err, endpoint)
    {
      if (err) { return callback(err); }
      if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }
      var uri = url.resolve(endpoint, 'domains/' + did + '/records/' +
        encodeURIComponent(recordId));
      var options = { json: record };
      transport.PUT(uri, authToken, options, function(err, response, body) {
        if (err) { return callback(err); }
        callback(null, body);
      });
    });
  });
};

// Update the name of a DNS record.
DNS.prototype.updateRecordNameByDomainId = function(did, recordId, newValue,
  callback)
{
  this.updateRecordByDomainId(did, recordId, { name: newValue }, callback);
};

// Update the data of a DNS record.
DNS.prototype.updateRecordDataByDomainId = function(did, recordId, newValue,
  callback)
{
  this.updateRecordByDomainId(did, recordId, { data: newValue }, callback);
};

// Update the ttl of a DNS record.
DNS.prototype.updateRecordTtlByDomainId = function(did, recordId, newValue,
  callback)
{
  this.updateRecordByDomainId(did, recordId, { ttl: newValue }, callback);
};

// Update the priority of a DNS record.
DNS.prototype.updateRecordPriorityByDomainId = function(did, recordId, newValue,
  callback)
{
  this.updateRecordByDomainId(did, recordId, { priority: newValue }, callback);
};


// ******************************************************************
// Domain name wrappers
//
// The methods above all require you to pass the domain ID (not the
// domain name). The following wrapper methods can be called with
// the domain name instead, which is more convenient.
// ******************************************************************

DNS.prototype.getDomain = function() {
  this._callWithDomainId(this.getDomainById, arguments);
};

DNS.prototype.updateDomain = function() {
  this._callWithDomainId(this.updateDomainById, arguments);
};

DNS.prototype.deleteDomain = function() {
  this._callWithDomainId(this.deleteDomainById, arguments);
};

DNS.prototype.getServers = function() {
  this._callWithDomainId(this.getServersById, arguments);
};

DNS.prototype.createRecord = function() {
  this._callWithDomainId(this.createRecordByDomainId, arguments);
};

DNS.prototype.listRecords = function() {
  this._callWithDomainId(this.listRecordsByDomainId, arguments);
};

DNS.prototype.getRecord = function() {
  this._callWithDomainId(this.getRecordByDomainId, arguments);
};

DNS.prototype.findRecords = function() {
  this._callWithDomainId(this.findRecordsByDomainId, arguments);
};

DNS.prototype.deleteRecord = function() {
  this._callWithDomainId(this.deleteRecordByDomainId, arguments);
};

DNS.prototype.updateRecordName = function() {
  this._callWithDomainId(this.updateRecordNameByDomainId, arguments);
};

DNS.prototype.updateRecordData = function() {
  this._callWithDomainId(this.updateRecordDataByDomainId, arguments);
};

DNS.prototype.updateRecordTtl = function() {
  this._callWithDomainId(this.updateRecordTtlByDomainId, arguments);
};

DNS.prototype.updateRecordPriority = function() {
  this._callWithDomainId(this.updateRecordPriorityByDomainId, arguments);
};

module.exports = DNS;
