# Release Notes

## Release 0.0.6

2013-06-28

### Fixes

* Add a missing check for connection errors. Previously this caused a `TypeError` to be thrown. Now an error will be returned to your callback.
