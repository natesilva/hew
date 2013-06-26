/**
 *  == DNS_Service ==
 *
 *  Interface to the HP Cloud DNS service
 *
 *  #### Fully-qualified domain names are required!
 *
 *  In the HP Cloud DNS system, domain names must be **fully-qualified**. This
 *  means they must end with a period (full-stop).
 *
 *  In many cases, Hew will silently add the missing period to the end of your
 *  domain names, but it’s better to explicitly include it.
 *
 *  * **Good:** `example.com.`
 *  * **Not so good:** `example.com`
 *
 *  #### Record ID
 *
 *  Because DNS records are not always unique (for example, you can have
 *  multiple `MX` or `A` records with the same name), some methods require you
 *  to know the **record ID**, which is the internal ID of a DNS record in the
 *  HP Cloud system.
 *
 *  If you don’t know the `recordId`, you’ll have to locate it, perhaps by using
 *  the [[DNS#findRecords]] method.
 *
 *  #### Domain metadata example
 *
 *  Several APIs return _domain metadata_, or arrays of domain metadata. A
 *  domain metadata structure looks like this:
 *
 *      {
 *        "name": "domain1.com.",
 *        "created_at": "2012-11-01T20:11:08.000000",
 *        "email": "nsadmin@example.org",
 *        "ttl": 3600,
 *        "serial": 1351800668,
 *        "id": "09494b72-b65b-4297-9efb-187f65a0553e"
 *      }
 *
 *  #### Resource record example
 *
 *  Some APIs return _resource records_, which look like this:
 *
 *      {
 *        "id": "2e32e609-3a4f-45ba-bdef-e50eacd345ad",
 *        "name": "www.example.com.",
 *        "type": "A",
 *        "ttl": 3600,
 *        "created_at": "2012-11-02T19:56:26.000000",
 *        "updated_at": "2012-11-04T13:22:36.000000",
 *        "data": "15.185.172.153",
 *        "domain_id": "89acac79-38e7-497d-807c-a011e1310438",
 *        "tenant_id": null,
 *        "priority": null,
 *        "version": 1
 *      }
 **/

/** section: DNS_Service
 *  class DNS
 *
 *  Interface to HP Cloud DNS service.
 **/

var transport = require('../transport')
  , NotProvisioned = require('../errors').NotProvisioned
  , ServiceError = require('../errors').ServiceError
  , url = require('url')
  ;

var SERVICE_TYPE = 'hpext:dns';
var SERVICE_VERSION = '1';

/**
 *  new DNS(authToken)
 *  - authToken (AuthToken): a valid [[AuthToken]] object
 *
 *  Constructor. See [DNS_Service](#dns_service).
 **/
function DNS(authToken) {
  this.authToken = authToken;
  this.domainMap = null;
}

/* internal, related to: DNS#_withDomainId
 *  DNS#_getDomainMap(callback)
 *  - callback (Function): `callback(err, domainMap)`
 *
 *  Get a map from domain names to their corresponding IDs.
 **/
DNS.prototype._getDomainMap = function(callback) {
  if (this.domainMap) { return callback(null, this.domainMap); }

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

/* internal, related to: DNS#_getDomainMap
 *  DNS#_withDomainId(dname, callback)
 *  - dname (String): the domain name
 *  - callback (Function): `callback(err, domainId)`
 *
 *  Many methods accept a domain name but, internally, they must be called with
 *  a domain ID instead. This maps the given domain name to the corresponding
 *  ID.
 **/
DNS.prototype._withDomainId = function(dname, callback) {
  this._getDomainMap(function(err, dmap) {
    if (err) { return callback(err); }
    if (!(dname in dmap)) {
      var e = new ServiceError('domain name "' + dname + '" not found');
      return callback(e);
    }

    callback(null, dmap[dname]);
  });
};

/**
 *  DNS#listDomains(callback)
 *  - callback (Function): `callback(err, domainMetadataArray)`
 *
 *  Get a list of domains in this tenant and their metadata.
 **/
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

/**
 *  DNS#getDomain(dname, callback)
 *  - dname (String): the domain name
 *  - callback (Function): `callback(err, domainMetadata)`
 *
 *  Get the metadata for a domain.
 **/
DNS.prototype.getDomain = function(dname, callback) {
  var self = this;
  self._withDomainId(dname, function(err, did) {
    if (err) { return callback(err); }
    self.authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
      function(err, endpoint)
    {
      if (err) { return callback(err); }
      if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

      var uri = url.resolve(endpoint, 'domains/' + did);
      transport.GET(uri, self.authToken, function(err, response, body) {
        if (err) { return callback(err); }
        callback(null, body);
      });
    });
  });
};

/**
 *  DNS#createDomain(dname, email, [ttl], callback)
 *  - dname (String): the domain name
 *  - email (String): e-mail address to be included in the `SOA` record for the
 *    domain
 *  - ttl (Integer): (optional) default TTL for new records created in this
 *    domain
 *  - callback (Function): `callback(err, domainMetadata)`
 *
 *  Create a new DNS domain in the HP Cloud system.
 **/
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

/**
 *  DNS#deleteDomain(dname, callback)
 *  - dname (String): the domain name to delete
 *  - callback (Function): `callback(err)`
 *
 *  <span style="color:red;">**Danger:** This method permanently deletes
 *  data.</span>
 *
 *  Permanently delete a domain and all of its resource records from the HP
 *  Cloud DNS system.
 **/
DNS.prototype.deleteDomain = function(dname, callback) {
  var self = this;
  self._withDomainId(dname, function(err, did) {
    if (err) { return callback(err); }
    self.authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
      function(err, endpoint)
    {
      if (err) { return callback(err); }
      if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

      var uri = url.resolve(endpoint, 'domains/' + did);
      transport.DELETE(uri, self.authToken, function(err) {
        if (err) { return callback(err); }
        callback(null);
      });
    });
  });
};

/**
 *  DNS#updateDomain(dname, email, [ttl], callback)
 *  - dname (String): the domain name to udpate
 *  - email (String): e-mail address to be included in the `SOA` record for the
 *    domain
 *  - ttl (Integer): (optional) default TTL for new records created in this
 *    domain
 *  - callback (Function): `callback(err, domainMetadata)`
 *
 *  Update a domain’s metadata.
 **/
DNS.prototype.updateDomain = function(dname, email, ttl, callback) {
  if (typeof ttl === 'function') {
    callback = ttl;
    ttl = null;
  }

  var self = this;
  self._withDomainId(dname, function(err, did) {
    if (err) { return callback(err); }
    self.authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
      function(err, endpoint)
    {
      if (err) { return callback(err); }
      if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

      var json = { email: email };
      if (ttl) { json.ttl = ttl; }

      var options = { json: json };
      var uri = url.resolve(endpoint, 'domains/' + did);
      transport.PUT(uri, self.authToken, options, function(err, response, body)
      {
        if (err) { return callback(err); }
        callback(null, body);
      });
    });
  });
};

/**
 *  DNS#getServers(dname, callback)
 *  - dname (String): the domain name
 *  - callback (Function): `callback(err, nameserversArray)`
 *
 *  Get a list of the assigned nameservers for this domain.
 *
 *  ##### Example response:
 *
 *      [ "ns4-65.akam.net.", "ns7-67.akam.net.", "ns6-66.akam.net." ]
 **/
DNS.prototype.getServers = function(dname, callback) {
  var self = this;
  self._withDomainId(dname, function(err, did) {
    if (err) { return callback(err); }
    self.authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
      function(err, endpoint)
    {
      if (err) { return callback(err); }
      if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

      var uri = url.resolve(endpoint, 'domains/' + did + '/servers');
      transport.GET(uri, self.authToken, function(err, response, body) {
        if (err) { return callback(err); }
        callback(null, body.servers.map(function(s) { return s.name; }));
      });
    });
  });
};

/**
 *  DNS#listRecords(dname, callback)
 *  - dname (String): the domain name
 *  - callback (Function): `callback(err, resourceRecordsArray)`
 *
 *  Return all DNS resource records for the given domain.
 **/
DNS.prototype.listRecords = function(dname, callback) {
  var self = this;
  self._withDomainId(dname, function(err, did) {
    if (err) { return callback(err); }
    self.authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
      function(err, endpoint)
    {
      if (err) { return callback(err); }
      if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

      var uri = url.resolve(endpoint, 'domains/' + did + '/records');
      transport.GET(uri, self.authToken, function(err, response, body) {
        if (err) { return callback(err); }
        callback(null, body.records);
      });
    });
  });
};

/**
 *  DNS#createRecord(dname, recordName, type, data, [ttl], [priority], callback)
 *  - dname (String): the domain name
 *  - recordName (String): record names hould be fully qualified
 *  - type (String): `A`, `AAAA`, `CNAME`, `MX`, `SRV`, `TXT`
 *  - data (String): the content or value of the DNS record
 *  - ttl (Integer): if not specified, the domain’s default TTL will be used
 *  - priority (Integer): required for some record types, including `MX` and
 *    `SRV`
 *  - callback (Function): `callback(err, resourceRecord)`
 *
 *  Create a DNS resource record.
 **/
// Create a DNS record
DNS.prototype.createRecord = function(dname, recordName, type, data, ttl,
  priority, callback)
{
  if (typeof ttl === 'function') {
    callback = ttl;
    ttl = null;
  }

  if (typeof priority === 'function') {
    callback = priority;
    priority = null;
  }

  var self = this;
  self._withDomainId(dname, function(err, did) {
    if (err) { return callback(err); }
    self.authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
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
        transport.POST(uri, self.authToken, options,
          function(err, response, body)
        {
          if (err) { return callback(err); }
          callback(null, body);
        });
      });
  });
};

/**
 *  DNS#getRecord(dname, recordId, callback)
 *  - dname (String): the domain name
 *  - recordId (String): the HP Cloud internal `id` of the resource record.
 *  - callback (Function): `callback(err, resourceRecord)`
 **/
DNS.prototype.getRecord = function(dname, recordId, callback) {
  var self = this;
  self._withDomainId(dname, function(err, did) {
    if (err) { return callback(err); }
    self.authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
      function(err, endpoint)
    {
      if (err) { return callback(err); }
      if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

      var uri = url.resolve(endpoint, 'domains/' + did + '/records/' +
        encodeURIComponent(recordId));
      transport.GET(uri, self.authToken, function(err, response, body) {
        if (err) { return callback(err); }
        callback(null, body);
      });
    });
  });
};

/**
 *  DNS#findRecords(dname, recordName, type, callback)
 *  - dname (String): the domain name
 *  - recordName (String): DNS resource record name to look for
 *  - type (String): DNS record type: `A`, `AAAA`, `CNAME`, `MX`, `SRV`, `TXT`
 *  - callback (Function): `callback(err, resourceRecordsArray)`
 *
 *  Get an array of all records matching the specification.
 *
 *  In DNS, the `recordName` is not necessarily unique. For example, if you have
 *  have multiple `MX` records for a domain, you can get all of them using this
 *  method.
 **/
DNS.prototype.findRecords = function(dname, recordName, type, callback)
{
  this.listRecords(dname, function(err, all) {
    if (err) { return callback(err); }
    var result = all.filter(function(r) {
      return (r.type === type && r.name === recordName);
    });
    callback(null, result);
  });
};

/**
 *  DNS#deleteRecord(dname, recordId, callback)
 *  - dname (String): the domain name
 *  - recordId (String): the HP Cloud internal `id` of the resource record.
 *  - callback (Function): `callback(err)`
 *
 *  <span style="color:red;">**Danger:** This method permanently deletes
 *  data.</span>
 **/
DNS.prototype.deleteRecord = function(dname, recordId, callback)
{
  var self = this;
  self._withDomainId(dname, function(err, did) {
    if (err) { return callback(err); }
    self.authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
      function(err, endpoint)
    {
      if (err) { return callback(err); }
      if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

      var uri = url.resolve(endpoint, 'domains/' + did + '/records/' +
        encodeURIComponent(recordId));
      transport.DELETE(uri, self.authToken, function(err) {
        if (err) { return callback(err); }
        callback(null);
      });
    });
  });
};

/* internal
 *  DNS#_updateRecord(dname, recordId, newValues, callback)
 *  - dname (String): the domain name
 *  - recordId (String): the resource record ID
 *  - newValues (Object): hash of new values to apply to the resource record
 *  - callback (Function): `callback(err, resourceRecord)`
 **/
DNS.prototype._updateRecord = function(dname, recordId, newValues, callback)
{
  var self = this;
  self._withDomainId(dname, function(err, did) {
    if (err) { return callback(err); }
    self.getRecord(dname, recordId, function(err, record) {
      if (err) { return callback(err); }

      if ('name' in newValues) { record.name = newValues.name; }
      if ('data' in newValues) { record.data = newValues.data; }
      if ('ttl' in newValues) { record.ttl = newValues.ttl; }
      if ('priority' in newValues) { record.priority = newValues.priority; }

      self.authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
        function(err, endpoint)
      {
        if (err) { return callback(err); }
        if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }
        var uri = url.resolve(endpoint, 'domains/' + did + '/records/' +
          encodeURIComponent(recordId));
        var options = { json: record };
        transport.PUT(uri, self.authToken, options,
          function(err, response, body)
        {
          if (err) { return callback(err); }
          callback(null, body);
        });
      });
    });
  });
};

/**
 *  DNS#updateRecordName(dname, recordId, newValue, callback)
 *  - dname (String): the domain name
 *  - recordId (String): the HP Cloud internal `id` of the resource record.
 *  - newValue (String): the new name for the resource record
 *  - callback (Function): `callback(err, resourceRecord)`
 **/
DNS.prototype.updateRecordName = function(dname, recordId, newValue, callback) {
  this._updateRecord(dname, recordId, { name: newValue }, callback);
};

/**
 *  DNS#updateRecordData(dname, recordId, newValue, callback)
 *  - dname (String): the domain name
 *  - recordId (String): the HP Cloud internal `id` of the resource record.
 *  - newValue (String): the new data for the resource record
 *  - callback (Function): `callback(err, resourceRecord)`
 **/
DNS.prototype.updateRecordData = function(dname, recordId, newValue, callback) {
  this._updateRecord(dname, recordId, { data: newValue }, callback);
};

/**
 *  DNS#updateRecordTtl(dname, recordId, newValue, callback)
 *  - dname (String): the domain name
 *  - recordId (String): the HP Cloud internal `id` of the resource record.
 *  - newValue (Integer): the new TTL value for the resource record
 *  - callback (Function): `callback(err, resourceRecord)`
 **/
DNS.prototype.updateRecordTtl = function(dname, recordId, newValue, callback) {
  this._updateRecord(dname, recordId, { ttl: newValue }, callback);
};

/**
 *  DNS#updateRecordPriority(dname, recordId, newValue, callback)
 *  - dname (String): the domain name
 *  - recordId (String): the HP Cloud internal `id` of the resource record.
 *  - newValue (Integer): the new priority value for the resource record
 *  - callback (Function): `callback(err, resourceRecord)`
 **/
DNS.prototype.updateRecordPriority = function(dname, recordId, newValue,
  callback)
{
  this._updateRecord(dname, recordId, { priority: newValue }, callback);
};

module.exports = DNS;
