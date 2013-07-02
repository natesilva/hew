var transport = require('../../transport')
  , NotProvisioned = require('../../errors').NotProvisioned
  , HewError = require('../../errors').HewError
  , crypto = require('crypto')
  , HashingPassThroughStream = require('./hashingPassThroughStream')
  , url = require('url')
  , util = require('util')
  ;

var SERVICE_TYPE = 'object-store';
var SERVICE_VERSION = '1.0';

// headers that we should ignore when setting headers
var READ_ONLY_HEADERS = [
  'content-length',
  'last-modified',
  'x-timestamp',
  'x-trans-id',
  'connection',
  'accept-ranges'
];

/**
 * @class ObjectStorage.StoredObject
 * # Interface for objects stored in HP Cloud {@link ObjectStorage}.
 *
 * An object is a file stored in an {@link ObjectStorage}
 * {@link ObjectStorage.Container Container}.
 *
 * Normally, you will not call the constructor for this class. Instead, use the
 * Container's methods to create an instance of
 * {@link ObjectStorage.StoredObject StoredObject}.
 *
 * ### To get an existing object
 *
 * Call {@link ObjectStorage.Container#getObject} with the name of the existing
 * object. The result will be a {@link ObjectStorage.StoredObject StoredObject}.
 *
 * ### To create a new object
 *
 * Call {@link ObjectStorage.Container#getObject} with the name for the new
 * object. The result will be a {@link ObjectStorage.StoredObject StoredObject}.
 * You must then call {@link ObjectStorage.StoredObject#put} or
 * {@link ObjectStorage.StoredObject#putStream} to actually upload the new file.
 *
 * @constructor
 * Constructor.
 * @param {AuthToken} authToken a valid AuthToken object
 * @new
 */
function StoredObject(authToken, cname, oname) {
  this.authToken = authToken;
  this.cname = cname;
  this.oname = oname;
}

module.exports = StoredObject;

/**
 * Get the public URL of this object.
 * @param {Function} callback `callback(err, endpoint)`
 * @param {Mixed} callback.err
 * @param {String} callback.endpoint the URL
 * @new
 */
StoredObject.prototype.getPublicUrl = function(callback) {
  var self = this;
  self.authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }
    if (endpoint[endpoint.length -1] !== '/') { endpoint += '/'; }
    endpoint += encodeURIComponent(self.cname) + '/' +
      encodeURIComponent(self.oname);
    callback(null, endpoint);
  });
};

/**
 * Determine if this {@link ObjectStorage.StoredObject StoredObject} refers to a
 * file that exists, or if it refers to a non-existing (new, not yet uploaded)
 * file.
 * @param {Function} callback `callback(err, exists)`
 * @param {Mixed} callback.err
 * @param {Boolean} callback.exists
 * @new
 */
StoredObject.prototype.exists = function(callback) {
  this.getHeaders(function(err) {
    if (!err) { return callback(null, true); }
    if (err.statusCode === 404) { return callback(null, false); }
    return callback(err);
  });
};

/**
 * Get the object (file) contents as a Node.js Buffer.
 * @param {Function} callback `callback(err, headers, buffer)`
 * @param {Mixed} callback.err
 * @param {Object} callback.headers the headers associated with the request,
 *     such as `Content-Type`
 * @param {Buffer} callback.buffer a Node.js Buffer.
 * @new
 */
StoredObject.prototype.get = function(callback) {
  var that = this;
  this.getPublicUrl(function(err, endpoint) {
    if (err) { return callback(err); }
    var options = { buffer: true, headers: { 'Accept': '*/*' } };
    transport.GET(endpoint, that.authToken, options,
      function(err, response, body)
    {
      if (err) { return callback(err); }
      callback(null, response.headers, body);
    });
  });
};

/**
 * Get the object (file) as a pipe()-able Node.js stream.
 * @param {Function} callback `callback(err, stream)`
 * @param {Mixed} callback.err
 * @param {Stream} callback.stream a Node.js readable stream
 * @new
 */
StoredObject.prototype.getStream = function(callback) {
  var that = this;
  this.getPublicUrl(function(err, endpoint) {
    if (err) { return callback(err); }
    var options = { stream: true, headers: { 'Accept': '*/*' } };
    transport.GET(endpoint, that.authToken, options, function(err, stream)
    {
      if (err) { return callback(err); }
      callback(null, stream);
    });
  });
};

/**
 * Create or replace this object using the given file contents. The file
 * contents are passed as either a `Buffer` or a string.
 * @param {Buffer | String} fileContents the file contents
 * @param {String} [contentType] the MIME content type, such as `image/jpeg` or
 *     `application/octet-stream`.
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @new
 */
StoredObject.prototype.put = function(fileContents, contentType, callback) {
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

/**
 * Create or replace this object using the given file contents. The file
 * contents are passed as a readable Node.js `Stream`.
 * @param {Stream} fileContents the file contents
 * @param {String} [contentType] the MIME content type, such as `image/jpeg` or
 *     `application/octet-stream`.
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @new
 */
StoredObject.prototype.putStream = function(stream, contentType, callback) {
  if (typeof contentType === 'function') {
    callback = contentType;
    contentType = null;
  }

  var that = this;
  this.getPublicUrl(function(err, endpoint) {
    if (err) { return callback(err); }

    var options = { stream: true, headers: {} };
    if (contentType) { options.headers['Content-Type'] = contentType; }
    options.headers['Transfer-Encoding'] = 'chunked';

    transport.PUT(endpoint, that.authToken, options, function(err, response) {
      if (err) { return callback(err); }
      var passThrough = new HashingPassThroughStream();
      stream.pipe(passThrough).pipe(response)
        .on('error', callback)
        .on('response', function(res) {
          var digest = passThrough.hashDigest;
          if (digest.toLowerCase() !== res.headers.etag.toLowerCase()) {
            var e = new HewError('checksum mismatch: possible corruption ' +
              'during file upload');
            return callback(e);
          }
          callback();
        })
      ;
    });
  });
};

/**
 * Delete this object (file).
 *
 * <span style="color:red;">**Danger:** This method permanently deletes
 * data.</span>
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @new
 */
StoredObject.prototype.deleteMe = function(callback) {
  var that = this;
  this.getPublicUrl(function(err, endpoint) {
    if (err) { return callback(err); }
    var options = { buffer: true };
    transport.DELETE(endpoint, that.authToken, options, function(err) {
      // Don't return an error if the file didn't exist. Note this
      // helps with scheduled deletion (self-destruct) files. Such
      // files remain in file listings for some time after the HP
      // Cloud system has marked them deleted.
      if (err && err.statusCode !== 404) { return callback(err); }
      return callback();
    });
  });
};

/**
 * Return a temporary URL for this object.
 * @param {Number} ttl how long (in seconds) the URL will remain valid
 * @param {String} [method="GET"] HTTP method for which the URL will be valid
 * @param {Function} callback `callback(err, url)`
 * @param {Mixed} callback.err
 * @param {String} callback.url the temporary URL
 * @new
 */
StoredObject.prototype.getTempUrl = function(ttl, method, callback) {
  if (typeof method === 'function') {
    callback = method;
    method = 'GET';
  }

  var self = this;
  self.getPublicUrl(function(err, endpoint) {
    var parts = url.parse(endpoint);

    var expires = Math.floor(Date.now() / 1000) + ttl;
    var hmacBody = method + '\n' + expires + '\n' + parts.pathname;

    var hmac = crypto.createHmac('sha1', self.authToken.secretKey);
    hmac.update(hmacBody);
    var sig = self.authToken.tenant.id + ':' + self.authToken.accessKey + ':' +
      hmac.digest('hex');

    parts.query = {
      temp_url_sig: sig,
      temp_url_expires: expires
    };

    callback(null, url.format(parts));
  });
};

/**
 * Get all object-level headers.
 * @param {Function} callback `callback(err, headers)`
 * @param {Mixed} callback.err
 * @param {Object} callback.headers example response:
 *
 *     {
 *         "Last-Modified": "Fri, 16 Nov 2012 15:34:56 GMT,
 *         "ETag": "4281c348eaf83e70ddce0e07221c3d28,
 *         "Content-Type": "text/plain,
 *         "Content-Length": "12,
 *         "X-Object-Meta-Reviewed": "Yes
 *     }
 * @new
 */
StoredObject.prototype.getHeaders = function(callback) {
  var that = this;
  this.getPublicUrl(function(err, endpoint) {
    if (err) { return callback(err); }
    transport.HEAD(endpoint, that.authToken, function(err, response) {
      if (err) { return callback(err); }
      callback(null, response.headers);
    });
  });
};

/**
 * Get one object-level header value.
 * @param {String} name the name of the header to get
 * @param {Function} callback `callback(err, value)`
 * @param {Mixed} callback.err
 * @param {String} callback.value
 * @new
 */
StoredObject.prototype.getHeader = function(name, callback) {
  name = name.toLowerCase();
  this.getHeaders(function(err, headers) {
    if (err) { return callback(err); }
    if (name in headers) { callback(null, decodeURIComponent(headers[name])); }
    else { callback(); }
  });
};

/**
 * Set an object-level header value.
 * @param {String} name the name of the header to set
 * @param {String} value the value
 * @param {Boolean} [escape=false] whether to URL-encode the value
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @new
 */
StoredObject.prototype.setHeader = function(name, value, escape, callback) {
  if (typeof escape === 'function') {
    callback = escape;
    escape = false;
  }

  var self = this;
  self.getPublicUrl(function(err, endpoint) {
    if (err) { return callback(err); }

    // Unlike account- or container-level metadata operations,
    // object-level metadata operations reset ALL headers. That
    // means we have to pass all existing headers in order to
    // preserve them so they don't get deleted.
    self.getHeaders(function(err, headers) {
      if (err) { return callback(err); }
      headers[name.toLowerCase()] = escape ? encodeURIComponent(value) : value;

      // some headers are read-only and shouldn't be passed
      READ_ONLY_HEADERS.forEach(function(headerName) {
        delete headers[headerName];
      });

      var options = { headers: headers };

      transport.POST(endpoint, self.authToken, options, function(err) {
        if (err) { return callback(err); }
        callback();
      });
    });
  });
};

/**
 * Delete an object-level header.
 *
 * <span style="color:red;">**Danger:** This method permanently deletes
 * data.</span>
 * @param {String} name name of the header to delete
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @new
 */
StoredObject.prototype.deleteHeader = function(name, callback) {
  var self = this;
  self.getPublicUrl(function(err, endpoint) {
    if (err) { return callback(err); }

    // Unlike the other metadata operations, this one resets ALL
    // headers.
    self.getHeaders(function(err, headers) {
      if (err) { return callback(err); }

      // some headers are read-only and shouldn't be passed
      READ_ONLY_HEADERS.forEach(function(headerName) {
        delete headers[headerName];
      });

      delete headers[name.toLowerCase()];

      var options = { headers: headers };

      transport.POST(endpoint, self.authToken, options, function(err)
      {
        if (err) { return callback(err); }
        callback();
      });
    });
  });
};

/**
 * Normalize a user-defined object metadata item name. Allows users to specify
 * metadata names as either the name (only) or X-Object-Meta-Name.
 * @ignore
 */
StoredObject.normalizeMetaName = function(name) {
  name = name.toLowerCase();
  if (!name.match(/^x\-object\-meta\-.+/)) {
    name = 'x-object-meta-' + name;
  }
  return name;
};

/**
 * Get all object-level user-defined metadata values.
 * @param {Function} callback `callback(err, values)`
 * @param {Mixed} callback.err
 * @param {Object} callback.values
 * @new
 */
StoredObject.prototype.getAllMetaValues = function(callback) {
  this.getHeaders(function(err, headers) {
    if (err) { return callback(err); }
    var result = {};
    Object.keys(headers).forEach(function(h) {
      if (h.match(/^x\-object-meta\-/)) { result[h] = headers[h]; }
    });
    callback(null, result);
  });
};

/**
 * Get an object-level user-defined metadata value.
 * @param {String} name the name of the user-defined metadata to get
 * @param {Function} callback `callback(err, value)`
 * @param {Mixed} callback.err
 * @param {String} callback.value
 * @new
 */
StoredObject.prototype.getMetaValue = function(name, callback) {
  name = StoredObject.normalizeMetaName(name);
  this.getHeader(name, callback);
};

/**
 * Set an object-level user-defined metadata value.
 * @param {String} name name of the value to set
 * @param {String} value the value
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @new
 */
StoredObject.prototype.setMetaValue = function(name, value, callback)
{
  name = StoredObject.normalizeMetaName(name);
  this.setHeader(name, value, true, callback);
};

/**
 * Delete an object-level user-defined metadata value.
 *
 * <span style="color:red;">**Danger:** This method permanently deletes
 * data.</span>
 * @param {String} name name of the value to delete
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @new
 */
StoredObject.prototype.deleteMetaValue = function(name, callback)
{
  name = StoredObject.normalizeMetaName(name);
  this.deleteHeader(name, callback);
};

/**
 * Schedule an object to be automatically deleted after a specified amount of
 * time.
 *
 * <span style="color:red;">**Danger:** This method permanently deletes
 * data.</span>
 * @param {Number | Date} when if a `Number`, the number of seconds after which
 *     the object should be deleted; if a `Date`, the date and time after which
 *     the object should be deleted
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 * @new
 */
StoredObject.prototype.selfDestruct = function(when, callback) {
  if (util.isDate(when)) {
    var stamp = Math.floor(when.getTime() / 1000);
    this.setHeader('X-Delete-At', stamp, callback);
  } else {
    this.setHeader('X-Delete-After', when, callback);
  }
};


module.exports = StoredObject;
