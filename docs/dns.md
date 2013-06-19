# Hew Documentation: DNS

## Status

✔ Complete: All planned methods for this class are implemented and have unit tests.

## Notes

In the HP Cloud DNS system, domain names must be **fully-qualified**. This means they must end with a period (full-stop).

In many cases, Hew will silently add the missing period to the end of your domain names, but it’s better to explicitly include it.

:x: example.com

:white_check_mark: example.com.

## Constructor

#### DNS(token)

Create a DNS controller object.

**Parameters:**

* **`token`**
  - A previously-created [`AuthToken`](authtoken.md).

## Methods

#### listDomains(callback)

Retrieve a list of DNS domains in your HP Cloud tenant.

**Parameters:**

* **`callback`**
  - `function(err, domainsArray)`
  - Each element in the `domainsArray` will be metadata representing one domain.

**Example Response:**

```json
[
     {
       "name": "domain1.com.",
       "created_at": "2012-11-01T20:11:08.000000",
       "email": "nsadmin@example.org",
       "ttl": 3600,
       "serial": 1351800668,
       "id": "09494b72-b65b-4297-9efb-187f65a0553e"
     },
     {
       "name": "domain2.com.",
       "created_at": "2012-11-01T20:09:48.000000",
       "email": "nsadmin@example.org",
       "ttl": 3600,
       "serial": 1351800588,
       "id": "89acac79-38e7-497d-807c-a011e1310438"
     }
 ]
 ```

#### getDomain(dname, callback)

Return metadata for the given domain name.

**Parameters:**

* **`dname`**
* **`callback`**
  - `function(err, response)`
  - The response contains the metadata for the given domain in HP Cloud DNS.

**Example Response:**

```json
{
  "name": "domain1.com.",
  "created_at": "2012-11-01T20:11:08.000000",
  "email": "nsadmin@example.org",
  "ttl": 3600,
  "serial": 1351800668,
  "id": "09494b72-b65b-4297-9efb-187f65a0553e"
}
```

#### createDomain(dname, email, [ttl], callback)

Create a new domain in your HP Cloud DNS account.

**Parameters:**

* **`dname`**
* **`email`**
  - e-mail address to be included in the `SOA` record for the domain
* **`ttl`**
  - default TTL for new records created in this domain
* **`callback`**
  - `function(err, response)`
  - The response contains the metadata for the newly-created domain in HP Cloud DNS.

#### updateDomain(dname, email, [ttl], callback)

Update an existing domain in your HP Cloud DNS account.

**Parameters:**

* **`dname`**
* **`email`**
  - e-mail address to be included in the `SOA` record for the domain
* **`ttl`**
  - default TTL for new records created in this domain
* **`callback`**
  - `function(err, response)`
  - The response contains the metadata for the newly-created domain in HP Cloud DNS.

#### deleteDomain(dname, callback)

:fire: **Warning:** This is an irreversible destructive operation!

Delete a domain and all of its resource records.

**Parameters:**

* **`dname`**
* **`callback`**
  - function(err)

#### getServers(dname, callback)

Retrieve a list of the assigned nameservers for the given domain.

**Parameters:**

* **`dname`**
* **`callback`**
  - `function(err, serversArray)`

**Example Response:**

```json
[ "ns4-65.akam.net.", "ns7-67.akam.net.", "ns6-66.akam.net." ]
```

#### createRecord(dname, recordName, type, data, [ttl], [priority], callback)

Create a DNS resource record.

**Parameters:**

* **`dname`**
* **`recordName`**
  - Record names should be fully qualified. For example, if your domain is `example.com.`, `www` would not be a valid record name, but `www.example.com.` would.
* **`type`**
  - DNS record type: `A`, `AAAA`, `CNAME`, `MX`, `SRV`, `TXT`
* **`data`**
  - The content or value of the DNS record.
* **`ttl`**
  - If not specified, the domain‘s default TTL will be used.
* **`priority`**
  - Required for some record types, including `MX` and `SRV`.
* **`callback`**
  - `function(err, response)`
  - The response contains the metadata for the newly-created record, including its HP Cloud internal `id`.

**Example Response:**

```json
{
  "id": "2e32e609-3a4f-45ba-bdef-e50eacd345ad",
  "name": "www.example.com.",
  "type": "A",
  "created_at": "2012-11-02T19:56:26.366792",
  "updated_at": null,
  "domain_id": "89acac79-38e7-497d-807c-a011e1310438",
  "ttl": 3600,
  "data": "15.185.172.152"
}
```

#### findRecords(dname, recordName, type, callback)

Return an array of all records matching the specification. For example, if you have multiple `MX` records for a domain, you can retrieve all of them using this method.

**Parameters:**

* **`dname`**
* **`recordName`**
  - DNS record name to look for.
  - All records with this name (and matching the other specifications you specify) will be returned.
  - In DNS, record names are not necessarily unique. For example, there can be multiple `A` records for a given name.
* **`type`**
  - DNS record type: `A`, `AAAA`, `CNAME`, `MX`, `SRV`, `TXT`
* **`callback`**
  - `function(err, recordsArray)`
  - In the `recordsArray`, each element contains metadata for one DNS record.

**Example Response:**

```json
[
     {
       "id": "2e32e609-3a4f-45ba-bdef-e50eacd345ad",
       "name": "www.example.com.",
       "type": "A",
       "ttl": 3600,
       "created_at": "2012-11-02T19:56:26.000000",
       "updated_at": "2012-11-04T13:22:36.000000",
       "data": "15.185.172.153",
       "domain_id": "89acac79-38e7-497d-807c-a011e1310438",
       "tenant_id": null,
       "priority": null,
       "version": 1
     },
     {
       "id": "8e9ecf3e-fb92-4a3a-a8ae-7596f167bea3",
       "name": "www.example.com.",
       "type": "A",
       "ttl": 3600,
       "created_at": "2012-11-04T13:57:50.000000",
       "updated_at": null,
       "data": "15.185.172.154",
       "domain_id": "89acac79-38e7-497d-807c-a011e1310438",
       "tenant_id": null,
       "priority": null,
       "version": 1
     }
 ]
```

#### getRecord(dname, recordId, callback)

Return the metadata for one DNS record.

**Parameters:**

* **`dname`**
* **`recordId`**
  - The HP Cloud internal `id` of the record.
  - If you don’t know it, you’ll have to locate it first, perhaps by using the `findRecords` method.
* **`callback`**
  - `function(err, recordMetadata)`

#### updateRecord\[…\](dname, recordId, newValue, callback)

This set of related methods can be used to update an existing DNS record.

* `updateRecordName(dname, recordId, newName, callback)`
  - rename a DNS record
* `updateRecordData(dname, recordId, newData, callback)`
  - change the data or value of a DNS record
* `updateRecordTtl(dname, recordId, newTtl, callback)`
  - change the TTL of a DNS record
* `updateRecordPriority(dname, recordId, newPriority, callback)`
  - change the priority of a DNS record

**Parameters:**

* **`dname`**
* **`recordId`**
  - The HP Cloud internal `id` of the record.
  - If you don’t know it, you’ll have to locate it first, perhaps by using the `findRecords` method.
* **`newValue`**
* **`callback`**
  - `function(err, recordMetadata)`

#### deleteRecord(dname, recordId, callback)

:fire: Destructive operation

Delete a DNS resource record.

**Parameters:**

* **`dname`**
* **`recordId`**
  - The HP Cloud internal `id` of the record.
  - If you don’t know it, you’ll have to locate it first, perhaps by using the `findRecords` method.
* **`callback`**
  - `function(err)`

#### listRecords(dname, callback)

Return an array of all resource records for the given domain.

**Parameters:**

* **`dname`**
* **`callback`**
  - `function(err, recordsArray)`
  - In the `recordsArray`, each element contains metadata for one DNS record.

**Example Response:**

```json
[
     {
       "id": "2e32e609-3a4f-45ba-bdef-e50eacd345ad",
       "name": "www.example.com.",
       "type": "A",
       "ttl": 3600,
       "created_at": "2012-11-02T19:56:26.000000",
       "updated_at": "2012-11-04T13:22:36.000000",
       "data": "15.185.172.153",
       "domain_id": "89acac79-38e7-497d-807c-a011e1310438",
       "tenant_id": null,
       "priority": null,
       "version": 1
     },
     {
       "id": "8e9ecf3e-fb92-4a3a-a8ae-7596f167bea3",
       "name": "www.example.com.",
       "type": "A",
       "ttl": 3600,
       "created_at": "2012-11-04T13:57:50.000000",
       "updated_at": null,
       "data": "15.185.172.154",
       "domain_id": "89acac79-38e7-497d-807c-a011e1310438",
       "tenant_id": null,
       "priority": null,
       "version": 1
     },
     {
       "id": "4ad19089-3e62-40f8-9482-17cc8ccb92cb",
       "name": "web.example.com.",
       "type": "CNAME",
       "ttl": 3600,
       "created_at": "2012-11-04T13:58:16.393735",
       "updated_at": null,
       "data": "www.example.com.",
       "domain_id": "89acac79-38e7-497d-807c-a011e1310438",
       "tenant_id": null,
       "priority": null,
       "version": 1
     }
 ]
```
