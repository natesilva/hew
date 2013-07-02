/**
 * @class ObjectStorage.StoredObject
 * # Interface for objects stored in HP Cloud {@link ObjectStorage}.
 *
 * @constructor
 * Constructor.
 * @param {AuthToken} authToken a valid AuthToken object
 */
function StoredObject(authToken, cname, oname) {
  this.authToken = authToken;
  this.name = cname;
  this.oname = oname;
}

module.exports = StoredObject;
