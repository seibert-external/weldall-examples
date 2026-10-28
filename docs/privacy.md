# Privacy notice and retention for the Weldall demo

As of October 2026. Items in [square brackets] are still open and must be settled before publication.

## What this is

The demo shows Weldall with the systems of an invented company (Brakenstedt Antriebstechnik GmbH). All companies, people, contracts, tickets, wiki pages and e-mails in it are invented; any resemblance to real companies or people is unintended. The demo is read-only and does not call language models. What you type into the chat stays in your client and with the model provider your client uses; the demo only receives the requests the agent sends to its APIs.

Controller: [name and address]. Privacy contact: [e-mail address].

## What the demo stores about you

You sign in with your account at [sign-in provider: Seibert account at customer.seibert.group; name the provider and link its privacy policy]. After sign-in, the demo's Weldall server stores in its database:

| Data | Purpose |
|---|---|
| Name, e-mail address, e-mail verification status, profile picture URL (if the provider supplies one), creation and update time | User account |
| Your identifier at the sign-in provider (issuer, subject) | Linking the sign-in |
| Sessions with expiry, IP address and browser identifier (user agent) | Keeping you signed in |
| [Whether tokens from the sign-in provider are stored; the database schema has fields for them] | – |
| Audit events: time, type (e.g. sign-in, token issued for an API), your user ID and e-mail address, client ID, outcome, technical details | Accountability and abuse detection |
| Skill retrievals: which skill, your user ID and name, time | Skill usage statistics |

The demo APIs (contracts, CRM, tickets, wiki, mailbox) store no queries and write no access logs. Stored briefly:

- a hash of each security proof (DPoP proof) until it expires, to prevent reuse (minutes);
- while checking group membership, your e-mail address for 5 minutes, under a hash of the address.

Every verified identity gets read access to the demo data (group `demo-readers`), never administration rights.

In addition: server and proxy logs of the hosting platform [Coolify/Traefik: whether access logs with IP addresses are written and how long they are kept], Weldall server logs at level INFO [whether they contain e-mail addresses]. Hosting: [provider and server location].

## Retention

- User accounts, sessions, audit events and skill retrievals: [set a period, e.g. 90 days after the last sign-in; Weldall does not delete these by itself, deletion happens [manually / by database reset] by [responsible role]].
- Security proofs and group lookups: automatically on expiry (minutes).
- A full reset of the demo deletes all stored data.

You can request access to or deletion of your account at any time: [contact]. Your rights under the GDPR (access, rectification, erasure, restriction, objection, complaint to a supervisory authority) are unaffected. Legal basis: [e.g. Art. 6(1)(b) or (f) GDPR].
