# Folder Tree

Project Command Center uses numbered top-level folders so active work, schedules, templates, archive, and reference material stay separated.

```text
project-command-center/
|-- 00_inbox/              # Unsorted notes, requests, temporary intake
|-- 01_calendar/           # Master schedule, milestones, deadlines
|-- 02_projects/           # Active project execution documents
|   |-- company-homepage-renewal/
|   |-- electrical-design-automation/
|   |-- tdd/
|   `-- vendor-item-db/
|-- 03_weekly-reviews/     # Weekly reviews and next-week plans
|-- 04_templates/          # Reusable document templates
|-- 05_archive/            # Completed, paused, or closed work
|-- 99_reference/          # Shared source material and technical references
|   |-- company-homepage/
|   |   |-- examples/
|   |   |-- screens/
|   |   `-- src/
|   |-- db-mcp/
|   |-- electrical-design/
|   |   |-- api-samples/
|   |   |-- originals/
|   |   |   `-- attachments/
|   |   |       |-- bom/
|   |   |       |-- elec/
|   |   |       |-- logs/
|   |   |       |-- P&ID/
|   |   |       |-- pid/
|   |   |       |-- 내역서/
|   |   |       `-- 전기설계/
|   |   |-- templates/
|   |   `-- tools/
|   |-- boq/
|   |   `-- originals/
|   |-- minio-mcp/
|   `-- vendor-item-db/
|-- .claude/               # Local Claude settings
|-- .gitignore
|-- .mcp.json              # Local MCP connection settings
|-- CLAUDE.md              # Agent operating rules
`-- README.md
```

## Classification Rules

| File type | Put it here |
|---|---|
| New unclassified notes or incoming files | `00_inbox/` |
| Deadlines, milestones, project-wide schedule | `01_calendar/` |
| Active project plans, meeting notes, task lists, deliverables | `02_projects/{project-name}/` |
| Weekly review notes | `03_weekly-reviews/` |
| Reusable writing formats | `04_templates/` |
| Finished or paused project folders | `05_archive/` |
| Source files, vendor docs, datasets, screenshots, API samples | `99_reference/{domain}/` |
| BOQ and quantity-estimate source files | `99_reference/boq/originals/` |
| Electrical design raw attachments | `99_reference/electrical-design/originals/attachments/` |
| Electrical design extraction scripts | `99_reference/electrical-design/tools/` |
| Homepage examples and screenshots | `99_reference/company-homepage/` |
