# Seeds — Template Data

These files contain **template data** for Project OS — universal content that helps any startup get started.

**Seeds are NOT project data.** They are reusable templates that any fork can use.

## What's included

| File | Content | Items |
|------|---------|-------|
| `checklist.sql` | 70 startup questions & actions across 7 pillars | 70 |
| `workflow.sql` | Default 11-step feature development workflow | 11 |

## How to use

Run these **after** all migrations (001-018):

```bash
# In Supabase SQL Editor, paste each file in order:
1. supabase/migrations/001_cockpit_tables.sql → 018_tasks_extend.sql
2. seeds/checklist.sql
3. seeds/workflow.sql
```

## Difference from migrations

| | Migrations | Seeds |
|-|-----------|-------|
| **Purpose** | Create tables and schema | Fill with template content |
| **When** | Always required | Optional (recommended) |
| **Idempotent** | Yes (IF NOT EXISTS) | Yes (DELETE + INSERT or WHERE NOT EXISTS) |
| **Project-specific** | No | No |
| **Can be customized** | No (don't modify) | Yes (edit before running) |

## Adding new seeds

If you contribute a useful template (e.g., a KPI template, a persona template), add it as a new `.sql` file here and submit a PR.
