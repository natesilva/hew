# Hew

Hew provides a Node.js API for [HP Cloud](https://www.hpcloud.com/).

* Hew is an independent project not affiliated with HP. The official HP Node.js interface can be found at: <http://hpcloud.github.io/hpcloud-js/>

## API Documentation

**Hew API Documentation** is at: <http://natesilva.github.io/hew/docs/#!/api>

## Github

The Hew Github repository is at: <https://github.com/natesilva/hew>

### Coverage

Currently Hew supports a subset of the [HP Cloud API](http://docs.hpcloud.com/api/):

* **Authentication Tokens**
* **Messaging**
* **DNS**
* **Object Storage**
* **CDN** (partial)
* **Identity** (partial)

### Installation

    npm install hew

### Quick start

Example showing use of the Messaging module:

```js
var Hew = require('hew');

var yourRegion = Hew.AuthToken.DEFAULT_REGION;
var yourAccessKey = '…';
var yourSecretKey = '…';
var yourTenantName = '…';
var qname = 'my-test-message-queue';

// obtain an authentication token
var token = new Hew.AuthToken(yourRegion, yourAccessKey, yourSecretKey,
  yourTenantName);

// create the Messaging controller
var messaging = new Hew.Messaging(token);

// create a test queue
messaging.createQueue(qname, function(err) {
  if (err) { return console.error(err); }
  console.log('test queue created');

  // send a message
  var message = { location: 'Palo Alto', temperature: 22, units: 'C' };
  messaging.send(qname, message, function(err, messageId) {
    if (err) { return console.error(err); }
    console.log('message was posted, with ID', messageId);

    // receive a message
    messaging.receive(qname, function(err, message) {
      if (err) { return console.error(err); }
      console.log('message received:', message.body);
      // prints: { location: 'Palo Alto', temperature: 22, units: 'C' }

      // delete the test queue
      messaging.deleteQueue(qname, function(err) {
        if (err) { return console.error(err); }
        console.log('test queue deleted');
      });
    });
  });
});
```

### Running unit tests

**Warning:** Do not run unit tests against your production HP Cloud account. Testing will create, update and delete resources in your account, including very large files for testing object storage.

To run unit tests:

1. Check out the Hew git repo.
1. Create `tests/config.json` (an example is provided).
1. Add the following key to `tests/config.json`:
    * `"i-created-this-account-for-testing-only": true`
1. From the the top of the repo, run `npm install`.
1. From the the top of the repo, run `npm test`.
