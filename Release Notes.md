# Release Notes

## Release 0.0.6

2013-06-28


### Fixes

* On a connection error, pass the error up the callback chain instead of throwing it.
* Don’t throw on JSON parse errors.
* The Container `delete()` method is renamed to `deleteObject()` because `delete` is a JavaScript reserved word. For backward compatibility The `delete` method remains as an alias of `deleteObject`.

### Enhancements

* New Container method `getTempUrl()` to retrieve a temporary URL for an object that expires after a pre-determined length of time.
* Add Accept headers to all REST requests.
