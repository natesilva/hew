// Unit tests. Run with mocha.

/*global describe:true it:true before:true after:true */


var should = require('should')
  , Hew = require('../index')
  , crypto = require('crypto')
  , fs = require('fs')
  , path = require('path')
  , Seq = require('seq')
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

describe('Object Storage: Permissions', function() {
  // file transfer functions can take a while to complete
  this.timeout(20000);

  var token = new Hew.AuthToken(null, config.apiKey, config.secretKey,
    config.tenantName);
  var os = new Hew.ObjectStorage(token);
  var cname = 'test-' + randomName();
  var container = null;

  before(function(done) {
    os.createContainer(cname, function(err, cont) {
      if (err) { return done(err); }
      container = cont;

      var contents = fs.readFileSync(path.join(__dirname, 'authToken.js'));
      contents.should.be.an.instanceOf(Buffer);
      container.put('authToken.js', contents, 'application/javascript', done);
    });
  });

  after(function(done) {
    os.deleteContainerAndAllContents(cname, done);
  });

  it('should get the current permissions', function(done) {
    container.getPermissions(function(err, permissions) {
      if (err) { return done(err); }
      permissions.getContainerReadHeader().should.be.empty;
      permissions.getContainerWriteHeader().should.be.empty;
      done();
    });
  });

  it('should set world permissions', function(done) {
    var acl = new Hew.ObjectStorage.Permissions();
    acl.grantPublicRead().grantWorldListing();

    Seq()
      .seq(function() { container.setPermissions(acl, this); })
      .seq(function() { container.getPermissions(this); })
      .seq(function(permissions) {
        permissions.getContainerReadHeader()
          .should.equal(acl.getContainerReadHeader());
        permissions.getContainerWriteHeader()
          .should.equal(acl.getContainerWriteHeader());
        done();
      })
      ['catch'](done)
    ;
  });

  it('should revoke all permissions', function(done) {
    Seq()
      .seq(function() { container.makePrivate(this); })
      .seq(function() { container.getPermissions(this); })
      .seq(function(permissions) {
        permissions.getContainerReadHeader().should.be.empty;
        permissions.getContainerWriteHeader().should.be.empty;
        done();
      })
      ['catch'](done)
    ;
  });

  it('should grant special permissions', function(done) {
    Seq()
      .seq(function() { container.getPermissions(this); })
      .seq(function(permissions) {
        permissions.grantRead('joe@hp.com').grantWrite('joe@hp.com');
        permissions.grantRead('sue@hp.com');
        container.setPermissions(permissions, this);
      })
      .seq(function() { container.getPermissions(this); })
      .seq(function(permissions) {
        permissions.getContainerReadHeader().should.include('*:joe@hp.com');
        permissions.getContainerReadHeader().should.include('*:sue@hp.com');
        permissions.getContainerWriteHeader().should.include('*:joe@hp.com');
        permissions.getContainerWriteHeader()
          .should.not.include('*:sue@hp.com');
        done();
      })
      ['catch'](done)
    ;
  });
});
