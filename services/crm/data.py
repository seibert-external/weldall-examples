"""Entirely fictional; organization IDs match the contracts API customer IDs."""

ORGANIZATIONS = [
    {
        "id": "org-100",
        "name": "Northstar Observatory",
        "industry": "Research",
        "status": "customer",
        "website": "https://northstar.example.com",
        "contractIds": ["ctr-1001", "ctr-1003"],
    },
    {
        "id": "org-200",
        "name": "Juniper Workshop",
        "industry": "Manufacturing",
        "status": "prospect",
        "website": "https://juniper.example.com",
        "contractIds": ["ctr-1002"],
    },
    {
        "id": "org-300",
        "name": "Harbor Library",
        "industry": "Education",
        "status": "lead",
        "website": "https://harbor.example.com",
        "contractIds": [],
    },
]
CONTACTS = [
    {
        "id": "person-100",
        "organizationId": "org-100",
        "name": "Alex Example",
        "role": "Operations",
        "email": "alex@northstar.example.com",
    },
    {
        "id": "person-200",
        "organizationId": "org-200",
        "name": "Sam Sample",
        "role": "Project lead",
        "email": "sam@juniper.example.com",
    },
    {
        "id": "person-300",
        "organizationId": "org-300",
        "name": "Robin Demo",
        "role": "Director",
        "email": "robin@harbor.example.com",
    },
]
ACTIVITIES = [
    {
        "id": "activity-100",
        "organizationId": "org-100",
        "date": "2026-08-01",
        "type": "meeting",
        "summary": "Fictional quarterly support review; no open issues.",
    },
    {
        "id": "activity-200",
        "organizationId": "org-200",
        "date": "2026-08-15",
        "type": "note",
        "summary": "Draft implementation agreement ready for mock review.",
    },
]
