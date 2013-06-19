# Proposed API and Status

* ✔ = Done
* … = Not done

## Errors
    ✔ [Hew.]Error
    ✔ NotAuthenticated
    ✔ NotProvisioned
    ✔ ServiceError


## AuthToken

    ✔ new AuthToken(region, accessKey, secretKey, [tenant])
        - region can be null for default (currently "region-a.geo-1")
    ✔ getTokenId(cb)
        - lazy
    ✔ getServiceEndpoint(serviceType, versionId, cb)

## Identity

    ✔ new Hew.Identity(authToken)

    ✔ listTenants([limit], cb)
    … createUserAccessKey([validFrom], [validTo], cb)
    … deleteUserAccessKey(accessKeyId, cb)
    … getAccessKeys(cb)
    … getAccessKey(accessKeyId, cb)
    … updateUserAccessKey(accessKeyId, newStatus, cb)

## DNS

    ✔ new Hew.DNS(authToken)

    ✔ listDomains(cb)
    ✔ getDomain(dname, cb)
    ✔ createDomain(dname, email, [ttl], cb)
    ✔ updateDomain(dname, email, [ttl], cb)
    ✔ deleteDomain(dname, cb)
    ✔ getServers(dname, cb)
    ✔ createRecord(dname, record_name, type, data, [ttl], [priority], cb)
    ✔ findRecords(dname, record_name, type, cb)
    ✔ getRecord(dname, record_id, cb)
    ✔ updateRecordName(dname, record_id, new_name, cb);
    ✔ updateRecordData(dname, record_id, new_data, cb);
    ✔ updateRecordTtl(dname, record_id, new_ttl, cb);
    ✔ updateRecordPriority(dname, record_id, new_priority, cb);
    ✔ deleteRecord(dname, record_id, cb)
    ✔ listRecords(dname, cb)

## Messaging

    ✔ new Hew.Messaging(authToken)

    ✔ listQueues(cb)
    ✔ createQueue(qname, cb)
    ✔ deleteQueue(qname, cb)
    ✔ send(qname, message, cb)
        - message is auto-serialized to JSON
    ✔ receive(qname, cb)
        - message is auto-parsed from JSON
    ✔ sendString(qname, message, cb)
        - message is native (must be a string)
    ✔ receiveString(qname, cb)
        - message is native (returned as a string)
