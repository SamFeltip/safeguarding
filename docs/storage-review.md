> Authentication update: custom email sessions and flow markers have been retired.
> The app now uses Auth0 Universal Login and SDK-managed in-memory bearer tokens;
> AUTH_STATE is no longer bound to the Worker. The review below records the previous
> email-link implementation. Domain data remains in private EU R2.

# Storage review

| Data                                    | Store                            | Reason                                                                                              |
| --------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------- |
| Short-lived login and session markers   | Workers KV (global)              | Small, frequently read, TTL-based opaque state; no R2 reads on session checks                       |
| Login tokens and profile                | Encrypted HttpOnly client cookie | Never stored in global KV values or frontend-accessible storage                                     |
| User emails, approval and permissions   | Auth0 UK tenant                  | Identity provider enforces authentication and assigns API permissions                               |
| Submitted documents and PDF attachments | Private EU R2                    | Immutable object payloads, efficient streaming and encrypted object storage                         |
| People/case records                     | Private EU R2                    | Existing low-volume CRUD/listing model; a KV migration gives no clear benefit                       |
| Access policies                         | Private EU R2                    | Strong read-after-write behavior matters for permission changes; eventual KV caching is undesirable |
| Detailed audit events                   | Private EU R2                    | Append-only records with unique keys, included in backups                                           |
| Encrypted backups                       | Private EU R2                    | Bulk immutable objects; KV is not a backup store                                                    |

No existing domain data was migrated. D1 would be useful if people/case lists need
indexed search, relational queries or transactional updates; that would be a
separate migration, rather than copying object records into KV.

KV now supports EU durable-storage jurisdictions, but edge caches can still be
global. Classic KV changes can take 60 seconds or more to become visible across
locations. Session revocation is therefore bounded by propagation and the token's
15-minute hard expiry. Auth0, rather than KV, consumes login codes atomically.

References:

- https://developers.cloudflare.com/kv/reference/data-location/
- https://developers.cloudflare.com/kv/concepts/how-kv-works/
- https://developers.cloudflare.com/r2/reference/consistency/
