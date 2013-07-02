// Unit tests. Run with mocha.

/*global describe:true it:true before:true after:true */


var should = require('should')
  , Hew = require('../index')
  , crypto = require('crypto')
  , fs = require('fs')
  , path = require('path')
  , Seq = require('seq')
  , Stream = require('stream')
  , request = require('request')
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

describe('StoredObject', function() {
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

  it('should get an existing object', function(done) {
    var so = container.getObject('authToken.js');
    so.exists(function(err, exists) {
      if (err) { return done(err); }
      exists.should.be.true;
      done();
    });
  });

  it('should create a StoredObject for a file that does not exist yet',
    function(done)
  {
    var so = container.getObject('foo-bar-baz.js');
    so.exists(function(err, exists) {
      if (err) { return done(err); }
      exists.should.be.false;
      done();
    });
  });

  it('should upload and download a file as a Buffer', function(done)
  {
    var contents = fs.readFileSync(path.join(__dirname, 'objectStorage.js'));
    contents.should.be.an.instanceOf(Buffer);
    var so = container.getObject('objectStorage.js');
    so.put(contents, 'application/javascript', function(err) {
      should.not.exist(err);
      so.get(function(err, headers, buff) {
        should.not.exist(err);
        should.exist(headers);
        should.exist(buff);
        headers.should.be.an.instanceOf(Object);
        buff.should.be.an.instanceOf(Buffer);
        headers.should.include({'content-type': 'application/javascript'});
        headers.should.include(
          {'content-length': contents.length.toString()});

        // downloaded file contents must be identical to uploaded
        var hash1 = crypto.createHash('sha1');
        hash1.update(buff);

        var hash2 = crypto.createHash('sha1');
        hash2.update(contents);

        hash1.digest('hex').should.equal(hash2.digest('hex'));

        done();
      });
    });
  });

  it('should upload and download a file as a Stream', function(done)
  {
    var contents = fs.createReadStream(path.join(__dirname, 'dns.js'));
    contents.should.be.an.instanceOf(Stream);
    var so = container.getObject('dns.js');
    so.putStream(contents, 'application/javascript', function(err) {
      should.not.exist(err);
      so.getStream(function(err, str) {
        should.not.exist(err);
        should.exist(str);
        str.should.be.an.instanceOf(Stream);

        // downloaded file contents must be identical to uploaded
        var hash1 = crypto.createHash('sha1');

        str.on('error', done);
        str.on('data', function(chunk) { hash1.update(chunk); });
        str.on('end', function() {
          var hash2 = crypto.createHash('sha1');
          var contents = fs.createReadStream(path.join(__dirname, 'dns.js'));

          contents.on('error', done);
          contents.on('data', function(chunk) { hash2.update(chunk); });
          contents.on('end', function() {
            hash1.digest('hex').should.equal(hash2.digest('hex'));
            done();
          });
        });
      });
    });
  });

  it('should download a file from a tempURL while the URL is valid',
    function(done)
  {
    var so = container.getObject('objectStorage.js');
    so.getTempUrl(5, function(err, tempUrl) {
      if (err) { return done(err); }
      request.get(tempUrl, function(err, response, body) {
        if (err) { return done(err); }

        // downloaded file contents must be identical to uploaded
        var hash1 = crypto.createHash('sha1');
        hash1.update(body);

        var contents = fs.readFileSync(path.join(__dirname,
          'objectStorage.js'));
        contents.should.be.an.instanceOf(Buffer);
        var hash2 = crypto.createHash('sha1');
        hash2.update(contents);

        hash1.digest('hex').should.equal(hash2.digest('hex'));

        // wait for it to expire and ensure it no longer works
        setTimeout(function() {
          request.get(tempUrl, function(err, response) {
            should.not.exist(err);
            response.should.not.be.within(200, 299);
            done();
          });
        }, 6000);
      });
    });
  });

  it('should retrieve object headers', function(done) {
    var so = container.getObject('authToken.js');
    so.getHeaders(function(err, headers) {
      if (err) { return done(err); }
      should.exist(headers);
      headers.should.have.property('content-type', 'application/javascript');
      done();
    });
  });

  it('should set and retrieve an object header', function(done) {
    var filename = 'authToken.js';
    var header = 'Content-Type';
    var value = 'application/octet-stream';

    var so = container.getObject(filename);

    Seq()
      .seq(function() { so.setHeader(header, value, this); })
      .seq('actualValue', function() { so.getHeader(header, this); })
      .seq(function() {
        should.exist(this.vars.actualValue);
        this.vars.actualValue.should.equal(value);
        done();
      })
      ['catch'](done)
    ;

  });

  it('should set and retrieve object metadata', function(done) {
    var filename = 'authToken.js';

    var name1 = 'For-Testing';
    var value1 = 'Yes';

    var name2 = 'X-Object-Meta-Foo';
    var value2 = 'Bar';

    var so = container.getObject(filename);

    Seq()
      .seq(function() { so.setMetaValue(name1, value1, this); })
      .seq(function() { so.setMetaValue(name2, value2, this); })
      .par('actualValue1', function() { so.getMetaValue(name1, this);})
      .par('actualValue2', function() { so.getMetaValue(name2, this);})
      .seq(function() {
        should.exist(this.vars.actualValue1);
        should.exist(this.vars.actualValue2);
        this.vars.actualValue1.should.equal(value1);
        this.vars.actualValue2.should.equal(value2);
        this.ok();
      })
      .seq(function() {
        so.deleteMetaValue(name1, this);
      })
      .seq('afterDeleteValues', function() {
        so.getAllMetaValues(this);
      })
      .seq(function() {
        this.vars.afterDeleteValues.should.not.have.ownProperty(name1);
        done();
      })
      ['catch'](done)
    ;
  });

  it('should self destruct after 5 seconds', function(done) {
    var filename = 'authToken.js';
    var so = container.getObject(filename);

    Seq()
      .seq(function() { so.selfDestruct(5, this); })
      .seq('contentType1', function() { so.getHeader('Content-Type', this); })
      .seq(function() {
        should.exist(this.vars.contentType1);   // should still exist
        // wait for deletion and continue
        setTimeout(this, 6000);
      })
      .seq('contentType2', function() {
        so.getHeader('Content-Type', function(err) {
          // should not exist and should have returned err
          should.exist(err);
          done();
        });
      })
      ['catch'](done)
    ;
  });
});
