var transport = require('../transport')
  , NotProvisioned = require('../errors').NotProvisioned
  , ServiceError = require('../errors').ServiceError
  , url = require('url')
  ;

var SERVICE_TYPE = 'hpext:dns';
var SERVICE_VERSION = '1';

/**
 * # Interface to the HP Cloud DNS service
 *
 * ### Fully-qualified domain names are required!
 *
 * In the HP Cloud DNS system, domain names must be **fully-qualified**. This
 * means they must end with a period (full-stop).
 *
 * In many cases, Hew will silently add the missing period to the end of your
 * domain names, but it’s better to explicitly include it.
 *
 * * <span style="color:green;">**Good:**</span> `example.com.`
 * * <span style="color:red;">**Not so good:**</span> `example.com`
 *
 * ### Record ID
 *
 * Because DNS records are not always unique (for example, you can have
 * multiple `MX` or `A` records with the same name), some methods require you
 * to know the **record ID**, which is the internal ID of a DNS record in the
 * HP Cloud system.
 *
 * If you don’t know the `recordId`, you’ll have to locate it, perhaps by using
 * the {@link DNS#findRecords} method.
 *
 * ### Domain metadata example
 *
 * Several APIs return _domain metadata_, or arrays of domain metadata. A
 * domain metadata structure looks like this:
 *
 *     {
 *       "name": "domain1.com.",
 *       "created_at": "2012-11-01T20:11:08.000000",
 *       "email": "nsadmin@example.org",
 *       "ttl": 3600,
 *       "serial": 1351800668,
 *       "id": "09494b72-b65b-4297-9efb-187f65a0553e"
 *     }
 *
 * ### Resource record example
 *
 * Some APIs return _resource records_, which look like this:
 *
 *     {
 *       "id": "2e32e609-3a4f-45ba-bdef-e50eacd345ad",
 *       "name": "www.example.com.",
 *       "type": "A",
 *       "ttl": 3600,
 *       "created_at": "2012-11-02T19:56:26.000000",
 *       "updated_at": "2012-11-04T13:22:36.000000",
 *       "data": "15.185.172.153",
 *       "domain_id": "89acac79-38e7-497d-807c-a011e1310438",
 *       "tenant_id": null,
 *       "priority": null,
 *       "version": 1
 *     }
 *
 * @constructor
 * Constructor.
 * @param {AuthToken} authToken a valid AuthToken object
 */
function DNS(authToken) {
  this.authToken = authToken;
  this.domainMap = null;
}

/**
 * Get a map from domain names to their corresponding IDs.
 * @param {Function} callback `callback(err, domainMap)`
 * @ignore
 */
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

/**
 * Given a domain name, get its corresponding domain ID.
 * @param {String} dname the domain name
 * @param {Function} callback `callback(err, domainId)`
 * @ignore
 */
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
 * Get a list of domains for this tenant.
 * @param {Function} callback `callback(err, domainMetadataArray)`
 * @param {Mixed} callback.err
 * @param {Object[]} callback.domainMetadataArray array of domain metadata
 */
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
 * Get the metadata for a domain.
 * @param {String} dname the domain name
 * @param {Function} callback `callback(err, domainMetadata)`
 * @param {Mixed} callback.err
 * @param {Object} callback.domainMetadata
 */
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
 * Create a new DNS domain in the HP Cloud system.
 * @param {String} dname the domain name
 * @param {String} email e-mail address to be used in the `SOA` record for the
 *     domain
 * @param {Number} [ttl] default TTL for new records created in this
 *     domain
 * @param {Function} callback `callback(err, domainMetadata)`
 * @param {Mixed} callback.err
 * @param {Object} callback.domainMetadata
 */
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
      this.domainMap = null;
      callback(null, body);
    });
  });
};

/**
 * Permanently delete a domain and all of its resource records from the HP Cloud
 * DNS system.
 *
 * <span style="color:red;">**Danger:** This method permanently deletes
 * data.</span>
 * @param {String} dname the domain name
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
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
        this.domainMap = null;
        callback(null);
      });
    });
  });
};

/**
 * Update a domain’s metadata.
 * @param {String} dname the domain name
 * @param {String} email e-mail address to be used in the `SOA` record for the
 *     domain
 * @param {Number} [ttl] default TTL for new records created in this
 *     domain
 * @param {Function} callback `callback(err, domainMetadata)`
 * @param {Mixed} callback.err
 * @param {Object} callback.domainMetadata
 */
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
 * Get a list of the assigned nameservers for the domain.
 * @param {String} dname the domain name
 * @param {Function} callback `callback(err, nameserversArray)`
 * @param {Mixed} callback.err
 * @param {String[]} callback.nameserversArray example response:
 *
 *     [ "ns4-65.akam.net.", "ns7-67.akam.net.", "ns6-66.akam.net." ]
 */
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
 * Return all DNS resource records for the given domain.
 * @param {String} dname the domain name
 * @param {Function} callback `callback(err, resourceRecordsArray)`
 * @param {Mixed} callback.err
 * @param {Object[]} callback.resourceRecordsArray array of resource records
 */
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
 * Create a DNS resource record.
 * @param {String} dname the domain name
 * @param {String} recordName the **fully-qualified** record name
 * @param {String} type `A`, `AAAA`, `CNAME`, `MX`, `SRV`, `TXT`
 * @param {String} data the content or value of the DNS record
 * @param {Number} [ttl] if not specified, the domain’s default TTL will be used
 * @param {Number} [priority] required for some record types, including `MX` and
 *     `SRV`
 * @param {Function} callback `callback(err, resourceRecord)`
 * @param {Mixed} callback.err
 * @param {Object} callback.resourceRecord
 */
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
 * Get a DNS resource record.
 * @param {String} dname the domain name
 * @param {String} recordId the HP Cloud internal `id` of the resource record
 * @param {Function} callback `callback(err, resourceRecord)`
 * @param {Mixed} callback.err
 * @param {Object} callback.resourceRecord
 */
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
 * Get an array of all records matching the specification.
 *
 * In DNS, the `recordName` is not necessarily unique. For example, if you have
 * have multiple `MX` records for a domain, you can get all of them using this
 * method.
 * @param {String} dname the domain name
 * @param {String} recordName DNS resource record name to look for
 * @param {String} type DNS record type: `A`, `AAAA`, `CNAME`, `MX`, `SRV`,
 *     `TXT`
 * @param {Function} callback `callback(err, resourceRecordsArray)`
 * @param {Mixed} callback.err
 * @param {Object[]} callback.resourceRecordsArray array of resource records
 */
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
 * Delete a DNS resource record.
 *
 * <span style="color:red;">**Danger:** This method permanently deletes
 * data.</span>
 * @param {String} dname the domain name
 * @param {String} recordId the HP Cloud internal `id` of the resource record
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
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

/**
 * Update a DNS record (internal implementation)
 * @param {String} dname the domain name
 * @param {String} recordId the resource record ID
 * @param {Object} hash of new values to apply to the resource record
 * @param {Function} callback `callback(err, resourceRecord)`
 * @ignore
 */
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
 * Change the name of a DNS resource record.
 * @param {String} dname the domain name.
 * @param {String} recordId the HP Cloud internal `id` of the resource record
 * @param {String} newValue the new name for the resource record
 * @param {Function} callback `callback(err, resourceRecord)`
 * @param {Mixed} callback.err
 * @param {Object} callback.resourceRecord
 */
DNS.prototype.updateRecordName = function(dname, recordId, newValue, callback) {
  this._updateRecord(dname, recordId, { name: newValue }, callback);
};

/**
 * Change the data of a DNS resource record.
 * @param {String} dname the domain name.
 * @param {String} recordId the HP Cloud internal `id` of the resource record
 * @param {String} newValue the new data for the resource record
 * @param {Function} callback `callback(err, resourceRecord)`
 * @param {Mixed} callback.err
 * @param {Object} callback.resourceRecord
 */
DNS.prototype.updateRecordData = function(dname, recordId, newValue, callback) {
  this._updateRecord(dname, recordId, { data: newValue }, callback);
};

/**
 * Change the TTL of a DNS resource record.
 * @param {String} dname the domain name.
 * @param {String} recordId the HP Cloud internal `id` of the resource record
 * @param {Number} newValue the new TTL value for the resource record
 * @param {Function} callback `callback(err, resourceRecord)`
 * @param {Mixed} callback.err
 * @param {Object} callback.resourceRecord
 */
DNS.prototype.updateRecordTtl = function(dname, recordId, newValue, callback) {
  this._updateRecord(dname, recordId, { ttl: newValue }, callback);
};

/**
 * Change the priority of a DNS resource record.
 * @param {String} dname the domain name.
 * @param {String} recordId the HP Cloud internal `id` of the resource record
 * @param {Number} newValue the new priority for the resource record
 * @param {Function} callback `callback(err, resourceRecord)`
 * @param {Mixed} callback.err
 * @param {Object} callback.resourceRecord
 */
DNS.prototype.updateRecordPriority = function(dname, recordId, newValue,
  callback)
{
  this._updateRecord(dname, recordId, { priority: newValue }, callback);
};

module.exports = DNS;
