// Wrapper for the Messaging service.

var transport = require('../transport')
  , NotProvisioned = require('../errors').NotProvisioned
  ;

var SERVICE_TYPE = 'hpext:messaging';
var SERVICE_VERSION = '1.1';

// Constructor
function Messaging(authToken) {
  this.authToken = authToken;
}

// Get a list of message queues for the current tenant.
Messaging.prototype.listQueues = function(callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = endpoint + '/queues';
    transport.GET(uri, authToken, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body.queues);
    });
  });
};

// Create a message queue.
Messaging.prototype.createQueue = function(qname, callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = endpoint + '/queues/' + encodeURIComponent(qname);
    transport.PUT(uri, authToken, function(err) {
      if (err) { return callback(err); }
      callback(null);
    });
  });
};

// Delete a message queue and all messages in it.
Messaging.prototype.deleteQueue = function(qname, callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = endpoint + '/queues/' + encodeURIComponent(qname);
    transport.DELETE(uri, authToken, function(err) {
      if (err) { return callback(err); }
      callback(null);
    });
  });
};

// Send a message (which must be a string) to a message queue.
Messaging.prototype.sendString = function(qname, data, callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var json = { body: data };
    var options = { json: json };

    var uri = endpoint + '/queues/' + encodeURIComponent(qname) + '/messages';
    transport.POST(uri, authToken, options, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body.id);
    });
  });
};

// Retrieve a message (as a string) from the message queue.
Messaging.prototype.receiveString = function(qname, callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = endpoint + '/queues/' + encodeURIComponent(qname) + '/messages';
    transport.GET(uri, authToken, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body);
    });
  });
};

// Send a message (which can be any serializable JavaScript data
// type) to a queue.
Messaging.prototype.send = function(qname, data, callback) {
  this.sendString(qname, JSON.stringify(data), callback);
};

// Retrieve a message (as a JavaScript data type) from a queue.
Messaging.prototype.receive = function(qname, callback) {
  this.receiveString(qname, function(err, result) {
    if (err) { return callback(err); }
    if (result && result.body) { result.body = JSON.parse(result.body); }
    callback(null, result);
  });
};

module.exports = Messaging;
