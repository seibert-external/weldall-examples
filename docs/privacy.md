# Privacy notice and retention for the Weldall demo

As of November 2026.

## What this is

The demo shows Weldall with the systems of an invented company (Brakenstedt Antriebstechnik GmbH). For customer demos there is also an invented dental practice that only enabled accounts see. All companies, people, patients, appointments, contracts, tickets, wiki pages and e-mails in it are invented; any resemblance to real companies or people is unintended. The demo is read-only and does not call language models. What you type into the chat stays in your client and with the model provider your client uses; the demo only receives the requests the agent sends to its APIs.

Controller: Seibert Group GmbH, Luisenstraße 37-39, 65185 Wiesbaden, Germany. Privacy contact: datenschutz@seibert.group, data protection officer: dsb@seibert.group.

## What the demo stores about you

You sign in with your account at the Seibert Customer Login (customer.seibert.group) of Seibert Group GmbH; the [terms of use and privacy notice of the customer portal](https://go.seibert.group/recht/sg/kundenportal) apply to it. After sign-in, the demo's Weldall server stores in its database:

| Data | Purpose |
|---|---|
| Name, e-mail address, e-mail verification status, profile picture URL (if the provider supplies one), creation and update time | User account |
| Your identifier at the sign-in provider (issuer, subject) | Linking the sign-in |
| Sessions with expiry, IP address and browser identifier (user agent) | Keeping you signed in |
| Audit events: time, type (e.g. sign-in, token issued for an API), your user ID and e-mail address, client ID, outcome, technical details | Accountability and abuse detection |
| Skill retrievals: which skill, your user ID and name, time | Skill usage statistics |

The demo stores no tokens from the sign-in provider.

The demo APIs (contracts, CRM, tickets, wiki, mailbox, practice) store no queries and write no access logs. Stored briefly:

- a hash of each security proof (DPoP proof) until it expires, to prevent reuse (minutes);
- while checking group membership, your e-mail address for 5 minutes, under a hash of the address.

Every verified identity gets read access to the company demo data (group `demo-readers`), never administration rights. Only the accounts the operator lists get read access to the dental practice (group `praxis-demo`); their email addresses are kept in the deployment configuration for that purpose.

Every request necessarily processes your IP address. For operation and security, the hosting platform and the Weldall server write logs; the Weldall server masks e-mail addresses in them. The demo runs on the hosting platform managed by the Seibert Group, with servers provided by Hetzner Online GmbH, Gunzenhausen. Place of processing: Germany (EU).

## Retention

- User accounts, sessions, audit events and skill retrievals: until you ask for deletion or we reset the demo. Weldall does not delete these by itself.
- Logs: as long as needed for operation and security.
- Security proofs and group lookups: automatically on expiry (minutes).
- A full reset of the demo deletes all stored data.

You can request access to or deletion of your account at any time: datenschutz@seibert.group. Your rights under the GDPR (access, rectification, erasure, restriction, objection, complaint to a supervisory authority) are unaffected. Legal bases: Art. 6(1)(b) GDPR for the account and sign-in, Art. 6(1)(f) GDPR for audit events, skill retrievals and logs; our legitimate interest is secure and stable operation.
