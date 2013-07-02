// Unit tests. Run with mocha.

/*global describe:true it:true before:true after:true */


var should = require('should')
  , Hew = require('../index')
  , crypto = require('crypto')
  , fs = require('fs')
  , Stream = require('stream')
  , path = require('path')
  , request = require('request')
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

describe('Object Storage', function() {
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

      var contents = fs.readFileSync(path.join(__dirname, 'objectStorage.js'));
      contents.should.be.an.instanceOf(Buffer);
      container.put('authToken.js', contents, 'application/javascript', done);
    });
  });

  after(function(done) {
    os.deleteContainerAndAllContents(cname, done);
  });

  describe('listContainers', function() {

    it('should get a list of containers', function(done) {
      os.listContainers(function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.not.be.empty;
        var names = result.map(function(r) {
          return r.name;
        });
        names.should.include(cname);
        done();
      });
    });

  });

  describe('meta values', function() {

    it('should set and delete an account-level metadata value', function(done) {
      os.setMetaValue('Test-Account-Data', 'testvalue', function(err) {
        should.not.exist(err);
        os.getMetaValue('Test-Account-Data', function(err, value) {
          should.not.exist(err);
          should.exist(value);
          value.should.equal('testvalue');

          os.deleteMetaValue('X-Account-Meta-Test-Account-Data', function(err) {
            should.not.exist(err);
            os.getMetaValue('Test-Account-Data', function(err, value) {
              should.not.exist(err);
              should.not.exist(value);
              done();
            });
          });
        });
      });
    });

    it('should set and delete a container-level metadata value', function(done)
    {
      container.setMetaValue('Test-Container-Data', 'testvalue', function(err) {
        should.not.exist(err);
        container.getMetaValue('Test-Container-Data', function(err, value) {
          should.not.exist(err);
          should.exist(value);
          value.should.equal('testvalue');

          container.deleteMetaValue('X-Container-Meta-Test-Container-Data',
            function(err)
          {
            should.not.exist(err);
            container.getMetaValue('Test-Container-Data', function(err, value) {
              should.not.exist(err);
              should.not.exist(value);
              done();
            });
          });
        });
      });
    });

  });


  describe('container', function() {

    it('should get the test container', function(done) {
      os.getContainer(cname, function(err, cont) {
        should.not.exist(err);
        should.exist(cont);
        cont.should.be.an.instanceOf(Hew.Container);
        done();
      });
    });

    it('should upload and download a file as a Buffer', function(done)
    {
      var contents = fs.readFileSync(path.join(__dirname, 'objectStorage.js'));
      contents.should.be.an.instanceOf(Buffer);
      container.put('objectStorage.js', contents, 'application/javascript',
        function(err)
      {
        should.not.exist(err);
        container.get('objectStorage.js', function(err, headers, buff) {
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
      container.putStream('dns.js', contents,
        'application/javascript', function(err)
      {
        should.not.exist(err);
        container.getStream('dns.js', function(err, str) {
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
      container.getTempUrl('objectStorage.js', 5, function(err, tempUrl) {
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
          }, 5000);
        });
      });
    });

    it('should retrieve object headers', function(done) {
      container.getObjectHeaders('authToken.js', function(err, headers) {
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

      Seq()
        .seq(function() {
          container.setObjectHeader(filename, header, value, this);
        })
        .seq('actualValue', function() {
          container.getObjectHeader(filename, header, this);
        })
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

      Seq()
        .seq(function() {
          container.setObjectMetaValue(filename, name1, value1, this);
        })
        .seq(function() {
          container.setObjectMetaValue(filename, name2, value2, this);
        })
        .par('actualValue1', function() {
          container.getObjectMetaValue(filename, name1, this);
        })
        .par('actualValue2', function() {
          container.getObjectMetaValue(filename, name2, this);
        })
        .seq(function() {
          should.exist(this.vars.actualValue1);
          should.exist(this.vars.actualValue2);
          this.vars.actualValue1.should.equal(value1);
          this.vars.actualValue2.should.equal(value2);
          this.ok();
        })
        .seq(function() {
          container.deleteObjectMetaValue(filename, name1, this);
        })
        .seq('afterDeleteValues', function() {
          container.getAllObjectMetaValues(filename, this);
        })
        .seq(function() {
          this.vars.afterDeleteValues.should.not.have.ownProperty(name1);
          done();
        })
        ['catch'](done)
      ;
    });

    it('should self destruct', function(done) {
      var filename = 'authToken.js';

      Seq()
        .seq(function() { container.selfDestruct(filename, 5, this); })
        .seq('contentType1', function() {
          container.getObjectHeader(filename, 'Content-Type', this);
        })
        .seq(function() {
          should.exist(this.vars.contentType1);   // should still exist
          // wait for deletion and continue
          setTimeout(this, 5000);
        })
        .seq('contentType2', function() {
          container.getObjectHeader(filename, 'Content-Type', function(err) {
            // should not exist and should have returned err
            should.exist(err);
            done();
          });
        })
        ['catch'](done)
      ;
    });

  });
});
