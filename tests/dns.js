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
  return shasum.digest('hex').slice(0, 10);
}

describe('DNS', function() {
  // DNS functions can take a while to complete
  this.timeout(20000);

  var token = new Hew.AuthToken(null, config.apiKey, config.secretKey,
    config.tenantName);
  var dns = new Hew.DNS(token);
  var dname = 'test-' + randomName() + '.com.';

  before(function(done) {
    dns.createDomain(dname, 'administrator@company.com', function(err) {
      if (err) { return done(err); }
      dns.createRecord(dname, dname, 'A', '10.11.12.13', 300, function(err) {
        if (err) { return done(err); }
        dns.createRecord(dname, dname, 'MX', 'mail.' + dname, null, 10,
          function(err)
        {
          if (err) { return done(err); }
          dns.createRecord(dname, dname, 'A', '14.15.16.17', done);
        });
      });
    });
  });

  after(function(done) {
    dns.deleteDomain(dname, done);
  });

  describe('listDomains', function() {

    it('should get a list of domains', function(done) {
      dns.listDomains(function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.not.be.empty;
        done();
      });
    });
  });

  describe('getDomain', function() {
    it('should get one domain', function(done) {
      dns.getDomain(dname, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.name.should.equal(dname);
        done();
      });
    });

  });

  describe('updateDomain', function() {
    it('should update TTL for a domain', function(done) {
      var newTtl = 400;
      dns.updateDomain(dname, 'administrator@company.com', newTtl,
        function(err, result)
      {
        should.not.exist(err);
        should.exist(result);
        result.name.should.equal(dname);
        result.ttl.should.equal(newTtl);
        done();
      });
    });
  });

  describe('getServers', function() {
    it('should get servers for a domain', function(done) {
      dns.getServers(dname, function(err, result)
      {
        should.not.exist(err);
        should.exist(result);
        result.should.not.be.empty;
        done();
      });
    });
  });

  describe('createRecord', function() {
    it('should create a DNS record', function(done) {
      var type = 'TXT';
      var data = '"v=spf1 -all"';
      var ttl = 300;
      dns.createRecord(dname, dname, 'TXT', '"v=spf1 -all"', ttl,
        function(err, result1)
      {
        should.not.exist(err);
        should.exist(result1);
        result1.name.should.equal(dname);
        result1.type.should.equal(type);
        result1.data.should.equal(data);
        result1.ttl.should.equal(ttl);

        dns.getRecord(dname, result1.id, function(err, result2) {
          should.not.exist(err);
          result2.id.should.equal(result1.id);
          result2.name.should.equal(result1.name);
          result2.type.should.equal(result1.type);
          result2.data.should.equal(result1.data);
          result2.ttl.should.equal(result1.ttl);
          done();
        });
      });
    });
  });

  describe('findRecords', function() {
    it('should find multiple A records', function(done) {
      dns.findRecords(dname, dname, 'A', function(err, records) {
        should.not.exist(err);
        should.exist(records);
        records.should.be.an.instanceOf(Array);
        records.should.not.be.empty;
        done();
      });
    });
  });

  describe('deleteRecord', function() {
    it('should delete a DNS record', function(done) {
      dns.findRecords(dname, dname, 'A', function(err, records) {
        should.not.exist(err);
        should.exist(records);
        records.should.not.be.empty;
        dns.deleteRecord(dname, records[0].id, function(err) {
          should.not.exist(err);
          done();
        });
      });
    });
  });

  describe('updateRecord', function() {

    it('should update the name of a DNS record', function(done) {
      dns.findRecords(dname, dname, 'A', function(err, records) {
        should.not.exist(err);
        var r = records[0];
        var newValue = 'users.' + dname;
        dns.updateRecordName(dname, r.id, newValue, function(err, rec) {
          should.not.exist(err);
          rec.name.should.equal(newValue);
          done();
        });
      });
    });

    it('should update the data of a DNS record', function(done) {
      dns.findRecords(dname, dname, 'MX', function(err, records) {
        should.not.exist(err);
        var r = records[0];
        var newValue = 'incoming.company.com.';
        dns.updateRecordData(dname, r.id, newValue, function(err, rec) {
          should.not.exist(err);
          rec.data.should.equal(newValue);
          done();
        });
      });
    });

    it('should update the TTL of a DNS record', function(done) {
      dns.findRecords(dname, dname, 'MX', function(err, records) {
        should.not.exist(err);
        var r = records[0];
        var newValue = 567;
        dns.updateRecordTtl(dname, r.id, newValue, function(err, rec) {
          should.not.exist(err);
          rec.ttl.should.equal(newValue);
          done();
        });
      });
    });

    it('should update the priority of a DNS record', function(done) {
      dns.findRecords(dname, dname, 'MX', function(err, records) {
        should.not.exist(err);
        var r = records[0];
        var newValue = 100;
        dns.updateRecordPriority(dname, r.id, newValue, function(err, rec) {
          should.not.exist(err);
          rec.priority.should.equal(newValue);
          done();
        });
      });
    });

  });
});
