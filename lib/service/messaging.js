/**
 *  == Messaging_Service ==
 *
 *  Interface to HP Cloud Messaging as a Service (MSGaaS)
 *
 *  The messaging service is a simple FIFO (first-in, first-out) queue. You
 *  create as many queues as needed and post and retrieve messages from them.
 *
 *  Internally, the only supported message type is a string. Usually you’ll want
 *  to pass something else, like a JavaScript object.
 *
 *  The [[Messaging]] class automatically serializes messages to and from JSON
 *  when you call [[Messaging#send]] and [[Messaging#receive]], allowing you to
 *  pass a JavaScript object, array, number, or string as a message.
 *
 *  If you’re dealing with non-JSON messages for some reason, use the
 *  [[Messaging#sendString]] and [[Messaging#receiveString]] methods, which deal
 *  in plain strings. It’s then up to you to ensure they are serialized or
 *  de-serialized.
 **/

/** section: Messaging_Service
 *  class Messaging
 *
 *  Interface to HP Cloud Messaging as a Service (MSGaaS).
 **/

 var transport = require('../transport')
  , NotProvisioned = require('../errors').NotProvisioned
  ;

var SERVICE_TYPE = 'hpext:messaging';
var SERVICE_VERSION = '1.1';

/**
 *  new Messaging(authToken)
 *  - authToken (AuthToken): a valid AuthToken object
 *
 *  Constructor. See [Messaging_Service](#messaging_service).
 **/
function Messaging(authToken) {
  this.authToken = authToken;
}

/**
 *  Messaging#listQueues(callback)
 *  - callback (Function): `callback(err, queuesArray)`
 *
 *  Get a list of message queues for the current tenant.
 *
 *  ##### Example response
 *
 *      [ "some-queue-name", "another-queue-name" ]
 **/
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
      var result = body.queues.map(function(q) { return q.name; });
      callback(null, result);
    });
  });
};

/**
 *  Messaging#createQueue(qname, callback)
 *  - qname (String): the queue name
 *  - callback (Function): `callback(err)`
 *
 *  Create a message queue.
 **/
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

/**
 *  Messaging#deleteQueue(qname, callback)
 *  - qname (String): the queue name
 *  - callback (Function): `callback(err)`
 *
 *  <span style="color:red;">**Danger:** This method permanently deletes
 *  data.</span>
 *
 *  Delete a message queue and all messages in it.
 **/
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

/** related to: Messaging#send
 *  Messaging#sendString(qname, data, callback)
 *  - qname (String): the queue name
 *  - data (String): must be a string
 *  - callback (Function): `callback(err, messageId)`
 *
 *  Send a message (which must be a string) to the named message queue.
 **/
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

/** related to: Messaging#receive
 *  Messaging#receiveString(qname, callback)
 *  - qname (String): the queue name
 *  - callback (Function): `callback(err, messageStruct)`
 *
 *  Receive a message from the message queue, or `null` if no message is
 *  available. If a message is received, the `body` will be a string.
 *
 *  Example response:
 *
 *      {
 *        "id": "12345678",
 *        "body": "Hello World!"
 *      }
 **/
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

/** related to: Messaging#sendString
 *  Messaging#send(qname, data, callback)
 *  - qname (String): the queue name
 *  - data (Object | Array | String): any serializable JavaScript data type
 *  - callback (Function): `callback(err, messageId)`
 *
 *  Send a message to the named message queue. The data will be serialized as
 *  JSON.
 **/
Messaging.prototype.send = function(qname, data, callback) {
  this.sendString(qname, JSON.stringify(data), callback);
};

/** related to: Messaging#receiveString
 *  Messaging#receive(qname, callback)
 *  - qname (String): the queue name
 *  - callback (Function): `callback(err, messageStruct)`
 *
 *  Receive a message from the message queue, or `null` if no message is
 *  available. If a message is received, the `body` is automatically parsed as
*   JSON.
 *
 *  Example response:
 *
 *      {
 *        "id": "12345678",
 *        "body": { "location": "Palo Alto", "temperature": 22, "units": "C" }
 *      }
 **/
Messaging.prototype.receive = function(qname, callback) {
  this.receiveString(qname, function(err, result) {
    if (err) { return callback(err); }
    if (result && result.body) { result.body = JSON.parse(result.body); }
    callback(null, result);
  });
};

module.exports = Messaging;
