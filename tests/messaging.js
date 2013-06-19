// Unit tests. Run with mocha.

/*global describe:true it:true before:true after:true */


var should = require('should')
  , Hew = require('../index')
  , crypto = require('crypto')
  ;

try {
  var config = require('./config.json');
  if (config['i-created-this-account-for-testing-only'] !== true) {
    console.error('Do not run tests against a live account. Please see the ' +
      'README.md file');
    process.exit(1);
  }
} catch (e) {
  console.error('Please add a config.json file to the tests directory.');
  process.exit(1);
}

function randomName() {
  var shasum = crypto.createHash('sha1');
  shasum.update(crypto.randomBytes(512));
  return shasum.digest('hex');
}

describe('Messaging', function() {
  var token = new Hew.AuthToken(null, config.apiKey, config.secretKey,
    config.tenantName);
  var messaging = new Hew.Messaging(token);
  var qname = randomName();

  before(function(done) {
    messaging.createQueue(qname, done);
  });

  after(function(done) {
    messaging.deleteQueue(qname, done);
  });

  describe('listQueues', function() {
    it('should get a list of queues', function(done) {
      messaging.listQueues(function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.be.an.instanceOf(Array);
        done();
      });
    });
  });

  describe('createQueue', function() {
    it('should create and delete a queue', function(done) {
      var newq = randomName();
      messaging.createQueue(newq, function(err) {
        should.not.exist(err);

        // verify queue exists
        messaging.listQueues(function(err, result) {
          should.not.exist(err);
          var exists = result.some(function(x) {
            return (x.name === newq);
          });
          exists.should.be.true;

          // delete the queue
          messaging.deleteQueue(newq, function(err) {
            should.not.exist(err);

            // verify queue was deleted
            messaging.listQueues(function(err, result) {
              should.not.exist(err);
              var exists = result.some(function(x) {
                return (x.name === newq);
              });
              exists.should.be.false;
              done();
            });
          });
        });
      });
    });
  });

  describe('send', function() {
    it('should send and retrieve a string on the queue', function(done) {
      var body = 'Hello, World!';
      messaging.sendRaw(qname, body, function(err, msgid)
      {
        should.not.exist(err);
        should.exist(msgid);

        messaging.receiveRaw(qname, function(err, msg) {
          should.not.exist(err);
          should.exist(msg);
          msg.id.should.equal(msgid);
          msg.body.should.eql(body);
          done();
        });
      });
    });

    it('should send and retrieve a JS object on the queue', function(done) {
      var body = {foo: 42, bar: ['a', 'b', 'c']};
      messaging.send(qname, body, function(err, msgid)
      {
        should.not.exist(err);
        should.exist(msgid);

        messaging.receive(qname, function(err, msg) {
          should.not.exist(err);
          should.exist(msg);
          msg.id.should.equal(msgid);
          msg.body.should.eql(body);
          done();
        });
      });
    });
  });

});
