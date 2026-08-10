# Project Database maintenance

The Project Database is data-driven. Its layout is generated at build time from
`source/_data/projects.yml`; project records do not have separate hand-written
HTML or CSS.

`/projects/` is a standalone Tabler interface rather than a Butterfly page.
Tabler supplies the cards, data grids, tables, steps and timeline; the local
`source/css/project-database.css` file only applies the forest-green identity
and a few project-specific sizing rules. Every record uses the same renderer.

The blog keeps only two overview articles for the publishing-system record: a
getting-started guide and an architecture reference. This file remains the
complete field reference for adding or maintaining project records.

## Add a project

1. Add the preview image under `source/img/projects/`.
2. Copy one project entry in `source/_data/projects.yml` and give it a permanent
   `id` and `slug`.
3. Fill in the project's facts, links, architecture, run instructions,
   configuration map and activity.
4. Run `pnpm check` in the Dev Container.

The generator then adds the project automatically to:

- `/projects/`;
- `/projects/<slug>/`;
- project counts and the Technology Index;
- Recent Activity when the project has curated `activity` entries.

Do not renumber existing IDs when sorting projects. `P-001`, `P-002`, `P-003`, and later
IDs are stable record identities, not array positions.

A small record can start with only real information and grow later:

```yaml
- id: P-004
  order: 4
  slug: my-project
  title: My Project
  page_title: My Project · Project Database
  subtitle: One-line project identity
  description: 这个项目实际解决的问题。
  summary:
    what: 它实际提供什么。
    why: 为什么需要它。
    boundary: 哪些内容明确不属于它。
  status:
    active: true
    short: Active
    detail: Active development
  started: { iso: '2026', display: '2026' }
  updated: { iso: '2026-08-08', display: '2026.08.08' }
  period: 2026 — Present
  card:
    image: /img/projects/my-project.webp
    stack: TypeScript · PostgreSQL
  preview:
    image: /img/projects/my-project.webp
    width: 800
    height: 500
    domain: example.com
    state: DEV
    label: APPLICATION
    title: My Project
    meta: Short · concrete · facts
  actions: []
  technology_refs: []
  identity: []
  technical_profile: []
  relations: []
  architecture:
    decisions:
      - subject: Data access
        choice: Server-side repository layer
        reason: Keeps persistence details out of UI components.
        tradeoff: Repository contracts must evolve with the data model.
        url: /technical-note/
  run_locally:
    title: Run locally
    command: { label: Development server, value: pnpm dev }
    items:
      - label: Requirements
        value: Git · Docker · VS Code
        note: 只写真实依赖，不写 secret。
  configuration:
    title: Structure & configuration
    items:
      - label: Application
        value: src/
        note: 项目源码入口。
  activity: []
```

Architecture, run instructions, configuration, activity and Engineering Notes
are optional. Missing data produces no empty section and no local-navigation
item. The visual structure is shared by every project; a new record never needs
new HTML or CSS.

Real recurring failures can be added later without changing the renderer:

```yaml
troubleshooting:
  title: Troubleshooting
  items:
    - title: Port 4000 is already in use
      status: Resolved
      cause: An existing Hexo process is still running in the Dev Container.
      checks:
        - Check the existing process inside the Dev Container.
      resolution:
        - Stop that exact process.
        - Run pnpm dev again.
      command: pnpm dev
```

Do not add placeholder incidents merely to fill this section. An empty
`troubleshooting` value is omitted from both the page and its section navigation.
Architecture decisions are also optional. When supplied, they appear below the
system-boundary summary using the shared Tabler list-group treatment; they do not
require project-specific HTML or CSS.

## Associate a blog post

Add the project slug to the normal post front matter:

```yaml
project: kita
project_type: case
```

The post then appears in that project's Engineering Notes table. One post may belong to
more than one project:

```yaml
project:
  - kita
  - openlist
project_type: decision
```

Optional fields:

```yaml
project_order: 30
project_index: false
```

- `project_order` provides an explicit order in Engineering Notes.
- `project_index: false` keeps an associated post out of Engineering Notes.

Older articles can remain in the curated `pinned` list inside `projects.yml`;
they do not need a bulk front-matter migration.

## What remains curated

The generator owns the visual structure. The following information still
requires editorial judgment because it is project knowledge, not appearance:

- the stable ID, title, status and short description;
- actions and external relations;
- architecture boundaries;
- run requirements and canonical configuration locations;
- meaningful repository or service activity events;
- which technical notes genuinely help someone understand the project.

Adding or editing any of these values does not require changing
`source/css/custom.css` or writing a new page layout.
