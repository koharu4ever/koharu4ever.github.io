/* global hexo */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const allowedStatusKinds = new Set(['active', 'warning', 'danger', 'inactive', 'archived']);
const articleTypeLabels = new Map([
  ['case', 'Case'],
  ['decision', 'Decision'],
  ['guide', 'Guide'],
  ['incident', 'Incident'],
  ['license', 'License'],
  ['note', 'Note'],
  ['operations', 'Operations'],
  ['recovery', 'Recovery'],
  ['reference', 'Reference'],
  ['review', 'Review'],
]);

const isoDayPattern = /^\d{4}-\d{2}-\d{2}$/;

function asArray(value) {
  if (value === undefined || value === null || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeUrl(value, label = 'URL') {
  const url = String(value ?? '').trim();
  if (!url) throw new Error(`[project-database] ${label} is required.`);
  if (
    [...url].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint <= 31 || codePoint === 127;
    })
  ) {
    throw new Error(`[project-database] ${label} contains control characters.`);
  }
  if (url.startsWith('//')) {
    throw new Error(`[project-database] ${label} must not use a protocol-relative URL: ${url}`);
  }
  const protocol = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLocaleLowerCase('en-US');
  if (protocol && !['http', 'https', 'mailto'].includes(protocol)) {
    throw new Error(`[project-database] ${label} uses an unsupported protocol: ${url}`);
  }
  return url;
}

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/^route\s*\d+\s*/i, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-');
}

function canonicalProjectUrl(slug) {
  return `/projects/${encodeURIComponent(slug)}/`;
}

function isIsoDay(value) {
  const date = String(value ?? '').trim();
  if (!isoDayPattern.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === date;
}

function requireIsoDay(value, label) {
  const date = String(value ?? '').trim();
  if (!isIsoDay(date)) {
    throw new Error(`[project-database] ${label} must be an ISO date (YYYY-MM-DD).`);
  }
  return date;
}

function eventIsoDay(value) {
  const date = String(value ?? '').trim();
  return isIsoDay(date) ? date : null;
}

function formatLongDate(value) {
  const date = eventIsoDay(value);
  if (!date) return String(value ?? '');
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function absoluteSiteUrl(siteUrl, value, label) {
  const base = safeUrl(siteUrl, 'site URL');
  if (!/^https?:\/\//i.test(base)) {
    throw new Error('[project-database] Hexo config.url must use http or https.');
  }
  return new URL(safeUrl(value, label), `${base.replace(/\/+$/, '')}/`).toString();
}

function externalLink(url, explicit) {
  return explicit === true || /^https?:\/\//i.test(url);
}

function anchorAttributes(link, label = 'link') {
  const url = safeUrl(link.url, label);
  const external = externalLink(url, link.external);
  return `href="${escapeHtml(url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}`;
}

function formatArticleType(value) {
  const raw = String(value || 'note').trim();
  const normalized = normalizeKey(raw);
  if (articleTypeLabels.has(normalized)) return articleTypeLabels.get(normalized);
  return raw.replace(
    /(^|[-_\s]+)(\p{L})/gu,
    (_, spacing, letter) => `${spacing ? ' ' : ''}${letter.toLocaleUpperCase('en-US')}`
  );
}

function postDate(post) {
  if (post.date?.format) return post.date.format('YYYY.MM.DD');
  const date = new Date(post.date);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10).replaceAll('-', '.');
}

function postTimestamp(post) {
  const value = Number(post.date?.valueOf?.());
  if (Number.isFinite(value)) return value;
  const parsed = new Date(post.date).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function postUrl(post) {
  return `/${String(post.path || '').replace(/^\/+/, '')}`;
}

function postProjectSlugs(post) {
  return asArray(post.project)
    .flatMap((value) => (typeof value === 'string' ? value.split(',') : value))
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function associatedPosts(posts, project) {
  return posts
    .filter(
      (post) =>
        post.published !== false &&
        post.draft !== true &&
        postProjectSlugs(post).includes(project.slug)
    )
    .map((post) => ({
      post,
      title: String(post.title || 'Untitled'),
      url: postUrl(post),
      date: postDate(post),
      type: formatArticleType(post.project_type),
      incident: normalizeKey(post.project_type) === 'incident',
      index: post.project_index !== false,
      order: Number.isFinite(Number(post.project_order)) ? Number(post.project_order) : Infinity,
      timestamp: postTimestamp(post),
    }));
}

function mergeProjectArticles(project, associated) {
  const seen = new Set();
  const manual = [...asArray(project.articles?.pinned), ...asArray(project.articles?.items)].map(
    (article, index) => ({
      ...article,
      _manual: true,
      _order: index,
    })
  );
  const automatic = associated
    .filter((article) => article.index)
    .sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      return right.timestamp - left.timestamp;
    });

  return [...manual, ...automatic].filter((article) => {
    const url = safeUrl(article.url, `${project.id} article URL`);
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

function normalizeProject(project, index) {
  const slug = String(project.slug || '').trim();
  const id = String(project.id || '').trim();
  if (!slug) throw new Error(`[project-database] Project at index ${index} is missing slug.`);
  if (/^\.{1,2}$/.test(slug)) {
    throw new Error(`[project-database] Project slug must not be a dot segment: ${slug}`);
  }
  if (!id) throw new Error(`[project-database] Project "${slug}" is missing id.`);

  return {
    ...project,
    id,
    slug,
    order: Number.isFinite(Number(project.order)) ? Number(project.order) : index + 1,
    url: canonicalProjectUrl(slug),
    title: String(project.title || slug),
    status: {
      active: project.status?.active === true,
      short: String(project.status?.short || (project.status?.active ? 'Active' : 'Inactive')),
      detail: String(project.status?.detail || project.status?.short || 'Inactive'),
      identity: project.status?.identity,
    },
  };
}

function validateData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('[project-database] source/_data/projects.yml is missing or invalid.');
  }

  const catalog = data.technology_catalog || {};
  const technologyGroups = data.technology_groups || {};
  const rawProjects = asArray(data.projects);
  rawProjects.forEach((project, index) => {
    if (typeof project.status?.active !== 'boolean') {
      const label = project.id || project.slug || `project at index ${index}`;
      throw new Error(`[project-database] ${label} status.active must be boolean.`);
    }
    if (project.slug && project.url && project.url !== canonicalProjectUrl(project.slug)) {
      throw new Error(
        `[project-database] ${project.id || project.slug} URL must be ${canonicalProjectUrl(
          project.slug
        )}.`
      );
    }
  });
  const projects = rawProjects.map(normalizeProject).sort((a, b) => a.order - b.order);
  const ids = new Set();
  const slugs = new Set();

  for (const project of projects) {
    if (ids.has(project.id))
      throw new Error(`[project-database] Duplicate project id: ${project.id}`);
    if (slugs.has(project.slug)) {
      throw new Error(`[project-database] Duplicate project slug: ${project.slug}`);
    }
    ids.add(project.id);
    slugs.add(project.slug);

    if (!project.status.short || !project.status.detail) {
      throw new Error(`[project-database] ${project.id} status requires short and detail labels.`);
    }

    for (const item of asArray(project.identity)) {
      if (item.status && !allowedStatusKinds.has(String(item.status))) {
        throw new Error(
          `[project-database] ${project.id} identity status "${item.status}" is not supported.`
        );
      }
    }

    for (const reference of asArray(project.technology_refs)) {
      if (!catalog[reference]) {
        throw new Error(
          `[project-database] ${project.id} references unknown technology "${reference}".`
        );
      }
    }

    for (const parameter of asArray(project.configuration?.parameters)) {
      if (
        parameter?.required !== undefined &&
        parameter.required !== null &&
        typeof parameter.required !== 'boolean'
      ) {
        throw new Error(
          `[project-database] ${project.id} configuration parameter "${
            parameter.key || 'unnamed'
          }" required must be boolean.`
        );
      }
      if (
        parameter?.secret !== undefined &&
        parameter.secret !== null &&
        typeof parameter.secret !== 'boolean'
      ) {
        throw new Error(
          `[project-database] ${project.id} configuration parameter "${
            parameter.key || 'unnamed'
          }" secret must be boolean.`
        );
      }
    }
  }

  for (const [key, technology] of Object.entries(catalog)) {
    if (!technology.group || !technologyGroups[technology.group]) {
      throw new Error(
        `[project-database] Technology "${key}" must reference a known technology group.`
      );
    }
  }

  const reviewed = requireIsoDay(data.database?.reviewed?.iso, 'database.reviewed.iso');
  let newestProjectUpdate = '';
  for (const project of projects) {
    const updated = requireIsoDay(project.updated?.iso, `${project.id} updated.iso`);
    newestProjectUpdate = updated > newestProjectUpdate ? updated : newestProjectUpdate;

    const eventDates = [
      ...asArray(project.activity).map((item) => eventIsoDay(item?.date)),
      ...asArray(project.history?.items).map((item) => eventIsoDay(item?.datetime || item?.date)),
    ].filter(Boolean);
    const newestEvent = eventDates.sort().at(-1);
    if (newestEvent && updated < newestEvent) {
      throw new Error(
        `[project-database] ${project.id} updated.iso (${updated}) is earlier than its newest activity/history date (${newestEvent}).`
      );
    }
  }
  if (newestProjectUpdate && reviewed < newestProjectUpdate) {
    throw new Error(
      `[project-database] database.reviewed.iso (${reviewed}) is earlier than the newest project update (${newestProjectUpdate}).`
    );
  }

  const knownProjectUrls = new Set(projects.map((project) => project.url));
  for (const project of projects) {
    for (const relation of asArray(project.relations)) {
      const url = safeUrl(relation.url, `${project.id} relation URL`);
      if (url.startsWith('/projects/') && !knownProjectUrls.has(url)) {
        throw new Error(
          `[project-database] ${project.id} references unknown project relation "${url}".`
        );
      }
    }
  }

  return { database: data.database || {}, catalog, technologyGroups, projects };
}

function validatePostAssociations(posts, projects) {
  const knownSlugs = new Set(projects.map((project) => project.slug));
  for (const post of posts) {
    for (const slug of postProjectSlugs(post)) {
      if (!knownSlugs.has(slug)) {
        throw new Error(
          `[project-database] Post "${post.title || post.path}" references unknown project "${slug}".`
        );
      }
    }
  }
}

function activityItems(projects, limit = 8, perProjectLimit = 3) {
  const items = [];
  projects.forEach((project, projectIndex) => {
    const projectItems = [];
    asArray(project.activity).forEach((activity, itemIndex) => {
      projectItems.push({ ...activity, project, _order: projectIndex * 1000 + itemIndex });
    });
    asArray(project.history?.items)
      .filter((history) => history.activity)
      .forEach((history, itemIndex) => {
        projectItems.push({
          date: history.datetime || history.date,
          display_date: history.display_date || history.date,
          type: history.type,
          title: history.title,
          url: history.url || project.url,
          incident: normalizeKey(history.type) === 'incident',
          project,
          _order: projectIndex * 1000 + 500 + itemIndex,
        });
      });
    items.push(
      ...projectItems
        .sort((left, right) => {
          const dateDifference = Date.parse(right.date) - Date.parse(left.date);
          return dateDifference || left._order - right._order;
        })
        .slice(0, perProjectLimit)
    );
  });
  return items
    .sort((left, right) => {
      const dateDifference = Date.parse(right.date) - Date.parse(left.date);
      return dateDifference || left._order - right._order;
    })
    .slice(0, limit);
}

function technologyItems(projects, catalog, technologyGroups) {
  const counts = new Map();
  for (const project of projects.filter((item) => item.status.active)) {
    for (const reference of new Set(asArray(project.technology_refs))) {
      counts.set(reference, (counts.get(reference) || 0) + 1);
    }
  }
  return Object.entries(technologyGroups)
    .map(([key, label]) => ({
      key,
      label,
      items: Object.entries(catalog)
        .filter(([, technology]) => technology.group === key)
        .filter(([technologyKey]) => counts.has(technologyKey))
        .map(([technologyKey, technology]) => ({
          key: technologyKey,
          ...technology,
          count: counts.get(technologyKey),
        })),
    }))
    .filter((group) => group.items.length > 0);
}

function hasSectionData(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some((item) => {
    if (Array.isArray(item)) return item.length > 0;
    if (item && typeof item === 'object') return hasSectionData(item);
    return item !== undefined && item !== null && item !== '';
  });
}

function hasValue(value) {
  if (value === undefined || value === null) return false;
  return typeof value !== 'string' || value.trim() !== '';
}

function projectSummary(project) {
  return {
    what: project.summary?.what || project.description,
    why: project.summary?.why,
    boundary: project.summary?.boundary,
  };
}

function validProfileItems(project) {
  return asArray(project.technical_profile).filter((item) => item?.label && hasValue(item.value));
}

function hasOverviewContent(project) {
  const summary = projectSummary(project);
  return (
    Object.values(summary).some(hasValue) ||
    validProfileItems(project).length > 0 ||
    asArray(project.identity).some((item) => item?.label && hasValue(item.value)) ||
    asArray(project.actions).length > 0 ||
    asArray(project.relations).length > 0 ||
    Boolean(project.preview?.image)
  );
}

function hasRunContent(section) {
  if (!section || typeof section !== 'object') return false;
  const command = typeof section.command === 'string' ? section.command : section.command?.value;
  return (
    hasValue(section.intro) ||
    hasValue(command) ||
    asArray(section.items).some((item) => item?.label && hasValue(item.value)) ||
    asArray(section.steps).some(
      (item) => item?.label && (hasValue(item.command) || hasValue(item.note))
    ) ||
    asArray(section.checks).some(
      (item) => item?.label && (hasValue(item.value) || hasValue(item.note))
    ) ||
    asArray(section.links).some((link) => link?.label && link.url)
  );
}

function hasConfigurationContent(section) {
  if (!section || typeof section !== 'object') return false;
  return (
    hasValue(section.intro) ||
    asArray(section.items).some((item) => item?.label && hasValue(item.value)) ||
    asArray(section.parameters).some((parameter) => hasValue(parameter?.key))
  );
}

function evolutionItems(project) {
  return asArray(project.history?.items).filter((item) => item && hasValue(item.title));
}

function tablerStatusClass(project) {
  if (!project.status.active) return 'bg-secondary-lt text-secondary';
  return 'bg-green-lt text-green';
}

function renderTablerStatus(project, detail = false) {
  return `<span class="badge ${tablerStatusClass(project)}"><span class="status-dot status-dot-animated me-1"></span>${escapeHtml(
    detail ? project.status.detail : project.status.short
  )}</span>`;
}

function renderTablerNavbar(database, project) {
  const links = [
    { label: 'Blog', url: '/' },
    { label: 'Projects', url: '/projects/' },
    ...asArray(database.navigation?.library),
    ...asArray(database.navigation?.external),
  ];
  const seen = new Set();
  return `<header class="navbar navbar-expand-md navbar-dark d-print-none project-db-navbar">
    <div class="container-xl">
      <a class="navbar-brand navbar-brand-autodark" href="/projects/">
        <strong>Kral / Projects</strong>
      </a>
      <nav class="navbar-nav flex-row ms-auto project-db-navbar__links" aria-label="Project Database navigation">
        ${links
          .filter((link) => {
            const url = String(link.url || '');
            if (!url || seen.has(url)) return false;
            seen.add(url);
            return true;
          })
          .map((link) => {
            const active = project ? link.url === '/projects/' : link.url === '/projects/';
            return `<a class="nav-link${active ? ' active' : ''}" ${anchorAttributes(
              link,
              `navigation link "${link.label}"`
            )}${active ? ' aria-current="page"' : ''}><span class="nav-link-title">${escapeHtml(
              link.label
            )}</span></a>`;
          })
          .join('')}
      </nav>
    </div>
  </header>`;
}

function renderTablerDocument({
  title,
  description,
  database,
  project,
  body,
  pageClass,
  siteUrl,
  canonicalPath,
  socialImage,
}) {
  const canonical = absoluteSiteUrl(siteUrl, canonicalPath, 'canonical path');
  const shareImage = absoluteSiteUrl(
    siteUrl,
    socialImage || database.social_image || '/img/projects/project-forest.webp',
    'social image'
  );
  return `<!doctype html>
<html class="project-db-root" lang="zh-CN" data-bs-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="theme-color" content="#07140f">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="zh_CN">
  <meta property="og:site_name" content="Kral Project Database">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(shareImage)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(shareImage)}">
  <title>${escapeHtml(title)}</title>
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" type="image/svg+xml" href="/img/projects/project-database-icon.svg">
  <link rel="stylesheet" href="/vendor/tabler/tabler.min.css">
  <link rel="stylesheet" href="/css/project-database.css">
</head>
<body class="project-db-body ${escapeHtml(pageClass)}">
  <div class="page">
    ${renderTablerNavbar(database, project)}
    <div class="page-wrapper">
      ${body}
      <footer class="footer footer-transparent d-print-none project-db-footer">
        <div class="container-xl">
          <div class="text-secondary">Kral Project Database · Structured records generated from source data.</div>
        </div>
      </footer>
    </div>
  </div>
</body>
</html>`;
}

function renderTablerIndexHeader(database, recordCount) {
  return `<header class="page-header d-print-none project-db-page-header project-db-masthead">
    <div class="row align-items-end g-3">
      <div class="col">
        <div class="page-pretitle">${escapeHtml(
          database.masthead_label || 'PROJECT DATABASE · 2026'
        )}</div>
        <h1 class="page-title">${escapeHtml(database.title || 'Projects')}</h1>
        <p class="text-secondary mb-0">${escapeHtml(
          database.brand_subtitle || '实际开发、部署并长期维护的软件系统与独立服务。'
        )}</p>
        <div class="project-db-index-meta text-secondary font-monospace mt-2">
          ${recordCount} record${recordCount === 1 ? '' : 's'}${
            database.reviewed?.iso
              ? ` · Updated ${escapeHtml(formatLongDate(database.reviewed.iso))}`
              : ''
          }
        </div>
      </div>
    </div>
  </header>`;
}

function renderTablerProjectRows(projects) {
  return projects
    .map((project) => {
      const purpose = project.summary?.what || project.description;
      return `<a class="list-group-item list-group-item-action project-db-project-row" href="${escapeHtml(
        project.url
      )}">
        <div class="row align-items-center g-3">
          <div class="col-auto">
            <img class="avatar avatar-xl rounded project-db-project-thumb" src="${escapeHtml(
              safeUrl(project.card?.image, `${project.id} card image`)
            )}" alt="" loading="lazy" decoding="async">
          </div>
          <div class="col min-w-0">
            <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
              <span class="badge bg-azure-lt text-azure font-monospace">${escapeHtml(
                project.id
              )}</span>
              <h2 class="h3 mb-0 text-reset">${escapeHtml(project.title)}</h2>
              ${renderTablerStatus(project)}
            </div>
            ${
              project.subtitle
                ? `<p class="text-secondary mb-1">${escapeHtml(project.subtitle)}</p>`
                : ''
            }
            ${purpose ? `<p class="mb-2 project-db-project-purpose">${escapeHtml(purpose)}</p>` : ''}
            ${
              project.card?.stack
                ? `<div class="text-secondary font-monospace project-db-project-stack">${escapeHtml(
                    project.card.stack
                  )}</div>`
                : ''
            }
          </div>
          <div class="col-auto project-db-project-row__meta">
            <span class="text-secondary font-monospace">${escapeHtml(project.period)}</span>
            <span class="project-db-project-arrow" aria-hidden="true">→</span>
          </div>
        </div>
      </a>`;
    })
    .join('');
}

function renderTablerIndexActivity(projects, database) {
  const activity = activityItems(
    projects,
    Number(database.activity_limit) || 8,
    Number(database.activity_per_project) || 3
  );
  if (!activity.length) return '';
  return `<section class="card project-db-index-activity" aria-labelledby="project-activity-title">
    <div class="card-header">
      <div>
        <div class="subheader">${escapeHtml(database.sections?.activity?.kicker || 'Event log')}</div>
        <h2 class="card-title" id="project-activity-title">${escapeHtml(
          database.sections?.activity?.title || 'Recent Activity'
        )}</h2>
      </div>
    </div>
    <div class="project-db-activity-list" role="list">${activity
      .map(
        (item) => `<article class="project-db-activity-item" role="listitem">
          <time class="project-db-activity-date text-secondary font-monospace text-nowrap" datetime="${escapeHtml(
            item.date
          )}">${escapeHtml(item.display_date || item.date)}</time>
          <div class="project-db-activity-type"><span class="badge ${
            item.incident ? 'bg-red-lt text-red' : 'bg-secondary-lt text-secondary'
          }">${escapeHtml(item.type)}</span></div>
          <div class="project-db-activity-event"><a ${anchorAttributes(
            item,
            `${item.project.id} activity URL`
          )}>${escapeHtml(item.title)}</a></div>
          <div class="project-db-activity-record"><a href="${escapeHtml(
            item.project.url
          )}" class="font-monospace"><span>${escapeHtml(
            item.project.id
          )}</span> · ${escapeHtml(item.project.title)}</a></div>
        </article>`
      )
      .join('')}</div>
  </section>`;
}

function renderTablerTechnology(projects, catalog, technologyGroups, database) {
  const groups = technologyItems(projects, catalog, technologyGroups);
  if (!groups.length) return '';
  return `<section class="card project-db-technology" aria-labelledby="technology-index-title">
    <div class="card-body">
      <div class="subheader">${escapeHtml(database.sections?.technology?.kicker || 'Lookup')}</div>
      <h2 class="card-title" id="technology-index-title">${escapeHtml(
        database.sections?.technology?.title || 'Technology Index'
      )}</h2>
      <div class="project-db-technology-groups">
        ${groups
          .map(
            (
              group
            ) => `<section class="project-db-technology-group" aria-labelledby="technology-${escapeHtml(
              group.key
            )}">
              <h3 class="project-db-technology-group__title font-monospace" id="technology-${escapeHtml(
                group.key
              )}">${escapeHtml(group.label)}</h3>
              <div class="d-flex flex-wrap gap-2">${group.items
                .map((technology) => {
                  const count = `${technology.count} project${technology.count === 1 ? '' : 's'}`;
                  return `<a class="badge bg-secondary-lt text-secondary project-db-tech-badge" href="${escapeHtml(
                    safeUrl(technology.url, `${technology.name} technology URL`)
                  )}" aria-label="${escapeHtml(`${technology.name}, ${technology.role}, ${count}`)}">${escapeHtml(
                    technology.name
                  )}${technology.count > 1 ? `<span>${technology.count}</span>` : ''}</a>`;
                })
                .join('')}</div>
            </section>`
          )
          .join('')}
      </div>
    </div>
  </section>`;
}

function renderTablerIndex(database, catalog, technologyGroups, projects, siteUrl) {
  const body = `<main class="container-xl py-4 project-db-container">
    ${renderTablerIndexHeader(database, projects.length)}
    <div class="row row-cards">
      <div class="col-12">
        <section class="card project-db-projects" aria-labelledby="project-records-title">
          <div class="card-header">
            <div>
              <div class="subheader">${escapeHtml(database.sections?.projects?.kicker || 'Records')}</div>
              <h2 class="card-title" id="project-records-title">${escapeHtml(
                database.sections?.projects?.title || 'Project records'
              )}</h2>
            </div>
            <div class="card-actions text-secondary font-monospace">${projects.length} total</div>
          </div>
          <div class="list-group list-group-flush">${renderTablerProjectRows(projects)}</div>
        </section>
      </div>
      <div class="col-12">${renderTablerIndexActivity(projects, database)}</div>
      <div class="col-12">${renderTablerTechnology(
        projects,
        catalog,
        technologyGroups,
        database
      )}</div>
    </div>
    ${
      database.archive_note?.text
        ? `<p class="text-secondary small mt-4 mb-0"><strong>${escapeHtml(
            database.archive_note.label || 'Archive note'
          )}</strong> · ${escapeHtml(database.archive_note.text)}</p>`
        : ''
    }
  </main>`;
  return renderTablerDocument({
    title: database.title || 'Project Database',
    description: database.brand_subtitle || 'Kral Project Database',
    database,
    body,
    pageClass: 'project-db-index',
    siteUrl,
    canonicalPath: '/projects/',
    socialImage: database.social_image,
  });
}

function renderTablerActions(project) {
  const actions = asArray(project.actions).filter((link) => link?.label && link.url);
  if (!actions.length) return '';
  return `<div class="btn-list">${actions
    .map(
      (link, index) =>
        `<a class="btn ${index === 0 ? 'btn-green' : 'btn-outline-secondary'}" ${anchorAttributes(
          link,
          `${project.id} action "${link.label}"`
        )}>${escapeHtml(link.label)}</a>`
    )
    .join('')}</div>`;
}

function renderTablerDetailHeader(project) {
  return `<div class="page-header d-print-none project-db-record-header">
    <div class="row align-items-end g-3">
      <div class="col">
        <ol class="breadcrumb breadcrumb-arrows mb-2" aria-label="Breadcrumb">
          <li class="breadcrumb-item"><a href="/projects/">Projects</a></li>
          <li class="breadcrumb-item active" aria-current="page">${escapeHtml(project.id)}</li>
        </ol>
        <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
          <span class="badge bg-azure-lt text-azure font-monospace">${escapeHtml(project.id)}</span>
          ${renderTablerStatus(project, true)}
          ${
            project.updated?.display
              ? `<span class="text-secondary font-monospace">Updated ${escapeHtml(
                  project.updated.display
                )}</span>`
              : ''
          }
        </div>
        <h1 class="page-title project-db-record-title">${escapeHtml(project.title)}</h1>
        ${
          project.subtitle
            ? `<p class="text-secondary fs-3 mb-0">${escapeHtml(project.subtitle)}</p>`
            : ''
        }
      </div>
      <div class="col-auto">${renderTablerActions(project)}</div>
    </div>
  </div>`;
}

function renderTablerDataGrid(items) {
  const valid = asArray(items).filter((item) => item?.label && hasValue(item.value));
  if (!valid.length) return '';
  return `<div class="datagrid">${valid
    .map((item) => {
      const value = item.status
        ? `<span class="badge ${
            item.status === 'active' ? 'bg-green-lt text-green' : 'bg-secondary-lt text-secondary'
          }">${escapeHtml(item.value)}</span>`
        : `<div class="datagrid-content">${escapeHtml(item.value)}</div>`;
      return `<div class="datagrid-item"><div class="datagrid-title">${escapeHtml(
        item.label
      )}</div>${value}</div>`;
    })
    .join('')}</div>`;
}

function renderTablerOverview(project, catalog) {
  if (!hasOverviewContent(project)) return '';
  const preview = project.preview || {};
  const summary = projectSummary(project);
  const facts = [
    { label: 'Type', value: project.classification || project.status.identity },
    { label: 'Period', value: project.period || project.started?.display },
    ...asArray(project.identity).filter(
      (item) => !['status', 'started', 'updated'].includes(normalizeKey(item?.label))
    ),
    ...validProfileItems(project),
  ];
  const technologies = asArray(project.technology_refs)
    .map((reference) => catalog[reference])
    .filter(Boolean);
  const relations = asArray(project.relations).filter(
    (relation) => relation?.title && relation.url
  );
  return `<section id="overview" class="project-db-section" aria-labelledby="overview-title">
    <div class="row row-cards">
      ${
        preview.image
          ? `<div class="col-lg-5">
          <figure class="card project-db-preview">
            <img class="card-img-top" src="${escapeHtml(
              safeUrl(preview.image, `${project.id} preview image`)
            )}" alt="${escapeHtml(preview.alt || `${project.title} preview`)}" width="${escapeHtml(
              preview.width || 800
            )}" height="${escapeHtml(preview.height || 500)}" loading="eager" decoding="async">
            ${
              preview.domain || preview.state
                ? `<figcaption class="card-footer d-flex justify-content-between gap-3"><span class="text-secondary">${escapeHtml(
                    preview.domain
                  )}</span><span class="badge bg-green-lt text-green">${escapeHtml(
                    preview.state
                  )}</span></figcaption>`
                : ''
            }
          </figure>
        </div>`
          : ''
      }
      <div class="${preview.image ? 'col-lg-7' : 'col-12'}">
        <div class="card h-100">
          <div class="card-header"><h2 class="card-title" id="overview-title">Overview</h2></div>
          <div class="card-body">
            <dl class="project-db-summary">
              ${
                hasValue(summary.what)
                  ? `<div><dt>What</dt><dd>${escapeHtml(summary.what)}</dd></div>`
                  : ''
              }
              ${
                hasValue(summary.why)
                  ? `<div><dt>Why</dt><dd>${escapeHtml(summary.why)}</dd></div>`
                  : ''
              }
              ${
                hasValue(summary.boundary)
                  ? `<div><dt>Boundary</dt><dd>${escapeHtml(summary.boundary)}</dd></div>`
                  : ''
              }
            </dl>
            ${renderTablerDataGrid(facts)}
            ${
              technologies.length
                ? `<div class="d-flex flex-wrap gap-2 mt-4" aria-label="Technology profile">${technologies
                    .map(
                      (technology) =>
                        `<a class="badge bg-secondary-lt text-secondary" ${anchorAttributes(
                          technology,
                          `${project.id} technology "${technology.name}"`
                        )}>${escapeHtml(technology.name)}</a>`
                    )
                    .join('')}</div>`
                : ''
            }
            ${
              relations.length
                ? `<div class="list-group list-group-flush mt-4 project-db-relations">${relations
                    .map(
                      (relation) =>
                        `<a class="list-group-item list-group-item-action px-0" ${anchorAttributes(
                          relation,
                          `${project.id} relation "${relation.title}"`
                        )}><strong>${escapeHtml(relation.title)}</strong>${
                          relation.note
                            ? `<span class="text-secondary ms-2">${escapeHtml(relation.note)}</span>`
                            : ''
                        }<span class="float-end" aria-hidden="true">→</span></a>`
                    )
                    .join('')}</div>`
                : ''
            }
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function renderTablerArchitecture(project) {
  const section = project.architecture;
  if (!hasSectionData(section)) return '';
  const boundaryNodes = asArray(section.boundary?.nodes);
  const storage = asArray(section.storage);
  const decisions = asArray(section.decisions).filter(
    (decision) =>
      (decision?.subject || decision?.label) && hasValue(decision.choice || decision.value)
  );
  const relationships = [
    section.client?.title
      ? {
          label: section.client.label || 'Client',
          value: `${section.client.title} → ${section.boundary?.title || 'Application boundary'}`,
          note: section.client.note,
        }
      : null,
    boundaryNodes.length
      ? {
          label: section.boundary?.title || 'Application boundary',
          value: boundaryNodes
            .map((node) => node.title)
            .filter(Boolean)
            .join(' · '),
          note: boundaryNodes
            .map((node) => [node.label, node.note].filter(Boolean).join(': '))
            .join(' / '),
        }
      : null,
    storage.length
      ? {
          label: 'Persistent dependencies',
          value: storage
            .map((node) => node.title)
            .filter(Boolean)
            .join(' · '),
          note: storage
            .map((node) => [node.label, node.note].filter(Boolean).join(': '))
            .join(' / '),
        }
      : null,
    section.runtime?.title
      ? { label: section.runtime.label || 'Runtime', value: section.runtime.title }
      : null,
    section.external?.title
      ? {
          label: section.external.label || 'External relation',
          value: section.external.title,
          note: section.external.note,
          external: true,
        }
      : null,
  ].filter(Boolean);
  return `<section id="architecture" class="project-db-section" aria-labelledby="architecture-title">
    <div class="card">
      <div class="card-header">
        <div><div class="subheader">${escapeHtml(
          section.kicker || 'System boundaries'
        )}</div><h2 class="card-title" id="architecture-title">Architecture</h2></div>
        ${
          section.link
            ? `<div class="card-actions"><a ${anchorAttributes(
                section.link,
                `${project.id} architecture link`
              )}>${escapeHtml(section.link.label)}</a></div>`
            : ''
        }
      </div>
      <div class="list-group list-group-flush project-db-architecture-list">${relationships
        .map(
          (item, index) => `<div class="list-group-item${item.external ? ' bg-secondary-lt' : ''}">
            <div class="row align-items-start g-3">
              <div class="col-auto"><span class="badge bg-azure-lt text-azure font-monospace">${String(
                index + 1
              ).padStart(2, '0')}</span></div>
              <div class="col"><div class="text-secondary small text-uppercase">${escapeHtml(
                item.label
              )}</div><strong>${escapeHtml(item.value)}</strong>${
                item.note ? `<p class="text-secondary mb-0 mt-1">${escapeHtml(item.note)}</p>` : ''
              }</div>
            </div>
          </div>`
        )
        .join('')}</div>
      ${
        decisions.length
          ? `<div class="card-body border-top"><div class="subheader mb-3">Technical decisions</div><div class="list-group">${decisions
              .map(
                (decision) => `<div class="list-group-item"><div class="row align-items-start g-3">
                  <div class="col-md-3"><span class="badge bg-secondary-lt text-secondary">${escapeHtml(
                    decision.subject || decision.label
                  )}</span></div>
                  <div class="col"><strong>${escapeHtml(
                    decision.choice || decision.value
                  )}</strong>${
                    decision.reason || decision.note
                      ? `<p class="text-secondary mb-0 mt-1">${escapeHtml(
                          decision.reason || decision.note
                        )}</p>`
                      : ''
                  }${
                    decision.tradeoff
                      ? `<p class="text-secondary mb-0 mt-1"><span class="text-uppercase small">Trade-off:</span> ${escapeHtml(
                          decision.tradeoff
                        )}</p>`
                      : ''
                  }${
                    decision.url
                      ? `<a class="small d-inline-block mt-2" ${anchorAttributes(
                          decision,
                          `${project.id} architecture decision "${
                            decision.subject || decision.label
                          }"`
                        )}>Read rationale →</a>`
                      : ''
                  }</div>
                </div></div>`
              )
              .join('')}</div></div>`
          : ''
      }
    </div>
  </section>`;
}

function renderTablerRun(project) {
  const section = project.run_locally;
  if (!hasRunContent(section)) return '';
  const command =
    typeof section.command === 'string'
      ? { label: 'Command', value: section.command }
      : section.command || {};
  const items = asArray(section.items).filter((item) => item?.label && hasValue(item.value));
  const steps = asArray(section.steps).filter(
    (item) => item?.label && (hasValue(item.command) || hasValue(item.note))
  );
  const checks = asArray(section.checks).filter(
    (item) => item?.label && (hasValue(item.value) || hasValue(item.note))
  );
  const links = asArray(section.links).filter((link) => link?.label && link.url);
  return `<section id="run-locally" class="project-db-section" aria-labelledby="run-title">
    <div class="card">
      <div class="card-header"><div><div class="subheader">${escapeHtml(
        section.kicker || 'Development'
      )}</div><h2 class="card-title" id="run-title">${escapeHtml(
        section.title || 'Build & run'
      )}</h2></div>${
        links.length
          ? `<div class="card-actions">${links
              .map(
                (link) =>
                  `<a ${anchorAttributes(
                    link,
                    `${project.id} run link "${link.label}"`
                  )}>${escapeHtml(link.label)}</a>`
              )
              .join(' · ')}</div>`
          : ''
      }</div>
      <div class="card-body">
        ${section.intro ? `<p class="text-secondary">${escapeHtml(section.intro)}</p>` : ''}
        ${
          command.value
            ? `<div class="project-db-command mb-4"><div class="subheader">${escapeHtml(
                command.label || 'Command'
              )}</div><pre class="mb-0"><code>${escapeHtml(command.value)}</code></pre></div>`
            : ''
        }
        ${items.length ? renderTablerDataGrid(items) : ''}
        ${
          steps.length
            ? `<h3 class="h4 mt-4">Rebuild sequence</h3><ol class="steps steps-counter steps-green project-db-steps">${steps
                .map(
                  (step) =>
                    `<li class="step-item"><div class="project-db-step-content"><strong>${escapeHtml(
                      step.label
                    )}</strong>${
                      step.command ? `<code>${escapeHtml(step.command)}</code>` : ''
                    }${step.note ? `<small>${escapeHtml(step.note)}</small>` : ''}</div></li>`
                )
                .join('')}</ol>`
            : ''
        }
        ${
          checks.length
            ? `<h3 class="h4 mt-4">Verification</h3><div class="list-group">${checks
                .map(
                  (check) =>
                    `<div class="list-group-item"><div class="row align-items-start"><div class="col"><strong>${escapeHtml(
                      check.label
                    )}</strong>${
                      check.note
                        ? `<div class="text-secondary small mt-1">${escapeHtml(check.note)}</div>`
                        : ''
                    }</div>${
                      hasValue(check.value)
                        ? `<div class="col-auto"><code>${escapeHtml(check.value)}</code></div>`
                        : ''
                    }</div></div>`
                )
                .join('')}</div>`
            : ''
        }
      </div>
    </div>
  </section>`;
}

function renderTablerParameterMeta(parameter) {
  return [
    hasValue(parameter.source) ? ['Source', parameter.source] : null,
    hasValue(parameter.scope) ? ['Scope', parameter.scope] : null,
    typeof parameter.required === 'boolean'
      ? ['Requirement', parameter.required ? 'Required' : 'Optional']
      : null,
    parameter.secret === true ? ['Value', 'Secret'] : null,
    parameter.secret !== true && hasValue(parameter.default)
      ? ['Default', parameter.default]
      : null,
    hasValue(parameter.apply) ? ['Apply', parameter.apply] : null,
  ].filter(Boolean);
}

function renderTablerConfiguration(project) {
  const section = project.configuration;
  if (!hasConfigurationContent(section)) return '';
  const items = asArray(section.items).filter((item) => item?.label && hasValue(item.value));
  const parameters = asArray(section.parameters).filter((parameter) => hasValue(parameter?.key));
  return `<section id="configuration" class="project-db-section" aria-labelledby="configuration-title">
    <div class="card">
      <div class="card-header"><div><div class="subheader">${escapeHtml(
        section.kicker || 'Source map'
      )}</div><h2 class="card-title" id="configuration-title">${escapeHtml(
        section.title || 'Configuration'
      )}</h2></div></div>
      <div class="card-body">
        ${section.intro ? `<p class="text-secondary">${escapeHtml(section.intro)}</p>` : ''}
        ${items.length ? `<h3 class="h4">Key files and surfaces</h3>${renderTablerDataGrid(items)}` : ''}
      </div>
      ${
        parameters.length
          ? `<div class="table-responsive"><table class="table table-vcenter card-table project-db-parameter-table">
          <thead><tr><th scope="col">Parameter</th><th scope="col">Source / scope</th><th scope="col">Requirement</th><th scope="col">Effect</th></tr></thead>
          <tbody>${parameters
            .map((parameter) => {
              const meta = renderTablerParameterMeta(parameter);
              const source = meta.filter(([label]) => ['Source', 'Scope'].includes(label));
              const requirement = meta.filter(([label]) =>
                ['Requirement', 'Value', 'Default', 'Apply'].includes(label)
              );
              return `<tr><td><code>${escapeHtml(parameter.key)}</code></td><td>${source
                .map(
                  ([label, value]) =>
                    `<div><span class="text-secondary">${escapeHtml(
                      label
                    )}:</span> ${escapeHtml(value)}</div>`
                )
                .join('')}</td><td>${requirement
                .map(
                  ([label, value]) =>
                    `<span class="badge ${
                      value === 'Required' || value === 'Secret'
                        ? 'bg-yellow-lt text-yellow'
                        : 'bg-secondary-lt text-secondary'
                    } me-1">${escapeHtml(label)} · ${escapeHtml(value)}</span>`
                )
                .join('')}</td><td>${escapeHtml(parameter.effect || '')}</td></tr>`;
            })
            .join('')}</tbody>
        </table></div>`
          : ''
      }
    </div>
  </section>`;
}

function troubleshootingItems(project) {
  const section = project.troubleshooting;
  if (!section) return [];
  return asArray(section.items || section).filter((item) => {
    if (!item || !(hasValue(item.title) || hasValue(item.problem) || hasValue(item.label))) {
      return false;
    }
    return (
      hasValue(item.cause) ||
      hasValue(item.solution) ||
      hasValue(item.answer) ||
      hasValue(item.value) ||
      hasValue(item.note) ||
      asArray(item.checks).some(hasValue) ||
      asArray(item.resolution).some(hasValue)
    );
  });
}

function troubleshootingBadge(status) {
  const normalized = normalizeKey(status);
  if (!normalized) return '';
  const tone = ['resolved', 'fixed', 'verified'].includes(normalized)
    ? 'green'
    : ['incident', 'danger', 'critical'].includes(normalized)
      ? 'red'
      : ['warning', 'caution'].includes(normalized)
        ? 'yellow'
        : 'secondary';
  return `<span class="badge bg-${tone}-lt text-${tone} ms-2">${escapeHtml(status)}</span>`;
}

function renderTablerTroubleshooting(project) {
  const section = project.troubleshooting;
  const items = troubleshootingItems(project);
  if (!items.length) return '';
  return `<section id="troubleshooting" class="project-db-section" aria-labelledby="troubleshooting-title">
    <div class="card">
      <div class="card-header"><div><div class="subheader">Operations</div><h2 class="card-title" id="troubleshooting-title">${escapeHtml(
        section.title || 'Troubleshooting'
      )}</h2></div></div>
      <div class="accordion accordion-flush">${items
        .map((item, index) => {
          const title = item.title || item.problem || item.label;
          const solution = item.solution || item.answer || item.value || item.note;
          const checks = asArray(item.checks).filter(hasValue);
          const resolution = asArray(item.resolution).filter(hasValue);
          return `<details class="accordion-item"${index === 0 ? ' open' : ''}><summary class="accordion-header accordion-button"><span>${escapeHtml(
            title
          )}${troubleshootingBadge(item.status)}</span></summary><div class="accordion-body pt-0">${
            item.cause ? `<p><strong>Cause:</strong> ${escapeHtml(item.cause)}</p>` : ''
          }${
            checks.length
              ? `<div class="mb-3"><strong>Check</strong><ul class="mb-0 mt-1">${checks
                  .map((check) => `<li>${escapeHtml(check)}</li>`)
                  .join('')}</ul></div>`
              : ''
          }${
            resolution.length
              ? `<div class="mb-3"><strong>Resolution</strong><ol class="mb-0 mt-1">${resolution
                  .map((step) => `<li>${escapeHtml(step)}</li>`)
                  .join('')}</ol></div>`
              : ''
          }${solution ? `<p class="mb-0">${escapeHtml(solution)}</p>` : ''}${
            item.command
              ? `<pre class="mt-3 mb-0"><code>${escapeHtml(item.command)}</code></pre>`
              : ''
          }</div></details>`;
        })
        .join('')}</div>
    </div>
  </section>`;
}

function renderTablerEvolution(project) {
  const history = project.history || {};
  const items = evolutionItems(project);
  if (!items.length) return '';
  return `<section id="evolution" class="project-db-section" aria-labelledby="evolution-title">
    <div class="card">
      <div class="card-header"><div><div class="subheader">${escapeHtml(
        history.kicker || 'Project history'
      )}</div><h2 class="card-title" id="evolution-title">${escapeHtml(
        history.title || 'Evolution'
      )}</h2></div>${
        history.range
          ? `<div class="card-actions text-secondary font-monospace">${escapeHtml(
              history.range
            )}</div>`
          : ''
      }</div>
      <div class="card-body">
        <ul class="timeline timeline-simple">${items
          .map((item) => {
            const title = item.url
              ? `<a ${anchorAttributes(item, `${project.id} evolution URL`)}>${escapeHtml(
                  item.title
                )}</a>`
              : `<strong>${escapeHtml(item.title)}</strong>`;
            return `<li class="timeline-event"><div class="timeline-event-icon ${
              item.current ? 'bg-green-lt text-green' : 'bg-azure-lt text-azure'
            }"><span aria-hidden="true">${item.current ? '●' : '·'}</span></div><div class="card timeline-event-card"><div class="card-body"><div class="d-flex flex-wrap align-items-center gap-2 mb-1">${
              item.date || item.datetime
                ? `<time class="text-secondary font-monospace"${
                    item.datetime ? ` datetime="${escapeHtml(item.datetime)}"` : ''
                  }>${escapeHtml(item.date || item.datetime)}</time>`
                : ''
            }${
              item.type
                ? `<span class="badge ${
                    normalizeKey(item.type) === 'incident'
                      ? 'bg-red-lt text-red'
                      : 'bg-secondary-lt text-secondary'
                  }">${escapeHtml(item.type)}</span>`
                : ''
            }</div><div>${title}</div>${
              item.description
                ? `<p class="text-secondary mb-0 mt-1">${escapeHtml(item.description)}</p>`
                : ''
            }</div></div></li>`;
          })
          .join('')}</ul>
      </div>
    </div>
  </section>`;
}

function renderTablerProjectActivity(project) {
  const items = asArray(project.activity);
  if (!items.length) return '';
  const section = project.activity_section || {};
  return `<section id="repository-activity" class="project-db-section" aria-labelledby="repository-activity-title">
    <div class="card">
      <div class="card-header"><div><div class="subheader">${escapeHtml(
        section.kicker || 'Event log'
      )}</div><h2 class="card-title" id="repository-activity-title">${escapeHtml(
        section.title || 'Project Activity'
      )}</h2></div>${
        section.repository?.url
          ? `<div class="card-actions"><a ${anchorAttributes(
              section.repository,
              `${project.id} repository`
            )}>${escapeHtml(section.repository.label || 'Repository ↗')}</a></div>`
          : ''
      }</div>
      ${
        section.intro
          ? `<div class="card-body border-bottom"><p class="text-secondary mb-0">${escapeHtml(
              section.intro
            )}</p></div>`
          : ''
      }
      <div class="table-responsive"><table class="table table-vcenter card-table table-hover"><thead><tr><th scope="col">Date</th><th scope="col">Type</th><th scope="col">Event</th></tr></thead><tbody>${items
        .map(
          (item) =>
            `<tr><td class="text-secondary font-monospace text-nowrap">${escapeHtml(
              item.display_date || item.date
            )}</td><td><span class="badge ${
              item.incident || normalizeKey(item.type) === 'incident'
                ? 'bg-red-lt text-red'
                : 'bg-secondary-lt text-secondary'
            }">${escapeHtml(item.type)}</span>${
              item.commit ? `<code class="ms-2">${escapeHtml(item.commit)}</code>` : ''
            }</td><td>${
              item.url
                ? `<a ${anchorAttributes(item, `${project.id} activity URL`)}>${escapeHtml(
                    item.title
                  )}</a>`
                : escapeHtml(item.title)
            }${
              item.description
                ? `<div class="text-secondary small mt-1">${escapeHtml(item.description)}</div>`
                : ''
            }</td></tr>`
        )
        .join('')}</tbody></table></div>
    </div>
  </section>`;
}

function renderTablerEngineeringNotes(project, articles) {
  if (!articles.length) return '';
  return `<section id="engineering-notes" class="project-db-section project-db-notes" aria-labelledby="engineering-notes-title">
    <div class="card">
      <div class="card-header"><div><div class="subheader">Engineering archive</div><h2 class="card-title" id="engineering-notes-title">Engineering Notes</h2></div>${
        project.articles?.link
          ? `<div class="card-actions"><a ${anchorAttributes(
              project.articles.link,
              `${project.id} articles link`
            )}>${escapeHtml(project.articles.link.label)}</a></div>`
          : ''
      }</div>
      <div class="table-responsive"><table class="table table-vcenter card-table table-hover"><thead><tr><th scope="col">Date</th><th scope="col">Type</th><th scope="col">Title</th></tr></thead><tbody>${articles
        .map(
          (article) =>
            `<tr><td class="text-secondary font-monospace text-nowrap">${escapeHtml(
              article.date
            )}</td><td><span class="badge ${
              article.incident ? 'bg-red-lt text-red' : 'bg-secondary-lt text-secondary'
            }">${escapeHtml(formatArticleType(article.type))}</span></td><td><a href="${escapeHtml(
              safeUrl(article.url, `${project.id} article URL`)
            )}">${escapeHtml(article.title)}</a></td></tr>`
        )
        .join('')}</tbody></table></div>
    </div>
  </section>`;
}

function renderTablerSectionNav(project, articles) {
  const sections = [
    ['overview', 'Overview', hasOverviewContent(project)],
    ['architecture', 'Architecture', hasSectionData(project.architecture)],
    [
      'run-locally',
      project.run_locally?.nav_label || 'Build & run',
      hasRunContent(project.run_locally),
    ],
    [
      'configuration',
      project.configuration?.nav_label || 'Configuration',
      hasConfigurationContent(project.configuration),
    ],
    ['troubleshooting', 'Troubleshooting', troubleshootingItems(project).length > 0],
    ['evolution', project.history?.nav_label || 'Evolution', evolutionItems(project).length > 0],
    [
      'repository-activity',
      project.activity_section?.nav_label || 'Activity',
      asArray(project.activity).length > 0,
    ],
    ['engineering-notes', 'Notes', articles.length > 0],
  ].filter(([, , show]) => show);
  if (!sections.length) return '';
  return `<nav class="card project-db-section-nav" aria-label="${escapeHtml(
    project.title
  )} sections"><div class="card-body py-2"><div class="nav nav-pills flex-nowrap">${sections
    .map(
      ([id, label], index) =>
        `<a class="nav-link${index === 0 ? ' active' : ''}" href="#${escapeHtml(
          id
        )}">${escapeHtml(label)}</a>`
    )
    .join('')}</div></div></nav>`;
}

function renderTablerDetail(database, catalog, projects, project, associated, siteUrl) {
  const articles = mergeProjectArticles(project, associated);
  const body = `<div class="container-xl py-4 project-db-container">
    ${renderTablerDetailHeader(project)}
    ${renderTablerSectionNav(project, articles)}
    <main class="project-db-record">
      ${renderTablerOverview(project, catalog)}
      ${renderTablerArchitecture(project)}
      ${renderTablerRun(project)}
      ${renderTablerConfiguration(project)}
      ${renderTablerTroubleshooting(project)}
      ${renderTablerEvolution(project)}
      ${renderTablerProjectActivity(project)}
      ${renderTablerEngineeringNotes(project, articles)}
    </main>
    <nav class="project-db-record-switcher mt-4" aria-label="Project records">
      ${projects
        .map(
          (item) =>
            `<a class="badge ${
              item.slug === project.slug
                ? 'bg-green-lt text-green'
                : 'bg-secondary-lt text-secondary'
            }" href="${escapeHtml(item.url)}"${
              item.slug === project.slug ? ' aria-current="page"' : ''
            }>${escapeHtml(item.id)} · ${escapeHtml(item.title)}</a>`
        )
        .join('')}
    </nav>
  </div>`;
  return renderTablerDocument({
    title: project.page_title || `${project.title} · Project Database`,
    description: project.description || project.subtitle || project.title,
    database,
    project,
    body,
    pageClass: 'project-db-detail',
    siteUrl,
    canonicalPath: project.url,
    socialImage: project.preview?.image || project.card?.image,
  });
}

function tablerCssRoute() {
  let cssPath;
  try {
    cssPath = require.resolve('@tabler/core/dist/css/tabler.min.css');
  } catch (error) {
    throw new Error(
      '[project-database] @tabler/core is required. Run pnpm install inside the Dev Container before building.',
      { cause: error }
    );
  }

  let css;
  try {
    css = fs.readFileSync(cssPath);
  } catch (error) {
    throw new Error(`[project-database] Unable to read Tabler CSS at ${path.normalize(cssPath)}.`, {
      cause: error,
    });
  }

  return {
    path: 'vendor/tabler/tabler.min.css',
    data: css,
  };
}

function generatedPage(path, title, content, updated) {
  void title;
  void updated;
  return {
    path,
    layout: false,
    data: content,
  };
}

hexo.extend.generator.register('project-database', (locals) => {
  const data = hexo.locals.get('data')?.projects;
  const { database, catalog, technologyGroups, projects } = validateData(data);
  const siteUrl = String(hexo.config.url || '').trim();
  const posts = locals.posts?.toArray ? locals.posts.toArray() : [];
  validatePostAssociations(posts, projects);
  const pages = [
    tablerCssRoute(),
    generatedPage(
      'projects/index.html',
      database.title || 'Project Database',
      renderTablerIndex(database, catalog, technologyGroups, projects, siteUrl),
      database.reviewed?.iso
    ),
  ];

  for (const project of projects) {
    pages.push(
      generatedPage(
        `${project.url.replace(/^\/+/, '')}index.html`,
        project.page_title || `${project.title} · Project Database`,
        renderTablerDetail(
          database,
          catalog,
          projects,
          project,
          associatedPosts(posts, project),
          siteUrl
        ),
        project.updated?.iso
      )
    );
  }

  return pages;
});
