import {
  EVIDENCE_LABELS,
  HERB_STATUS_LABELS,
  LIFE_FORM_LABELS,
  monthName,
  PHOTO_KIND_LABELS,
  SAFETY_STATUS_LABELS,
  SOURCE_TYPE_LABELS,
  SOURCING_LABELS,
  TOXICITY_LABELS,
  USAGE_FORM_LABELS,
  type DictionaryKey,
  type HerbInput,
  type PhotoRef,
  type Recipe,
  type SafetyStatus,
  type Source,
  type SourceRef,
  sourceHref,
} from '@travy/shared';

export { sourceHref };
import type { LoadedContent } from './load';


export interface ReportOptions {
  /** Адрес фото относительно страницы отчёта */
  photoUrl: (herbId: string, file: string) => string;
  generatedAt: Date;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


const e = escapeHtml;
const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const STYLE = `
:root { --bg: #f4f6f1; --card: #ffffff; --text: #1d2a1f; --muted: #5d6b5f; --accent: #3f6b45; --line: #dde3d9;
  --proven: #3b6d11; --traditional: #b77a0b; --folk: #b5501f; --refuted: #a32d2d; }
@media (prefers-color-scheme: dark) { :root { --bg: #0f1512; --card: #18211b; --text: #e3ebe3; --muted: #9aaa9c;
  --accent: #9bd09b; --line: #2a362d; --proven: #97c459; --traditional: #ef9f27; --folk: #f0997b; --refuted: #f09595; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, sans-serif; }
.top, main { max-width: 960px; margin: 0 auto; padding: 16px; }
h1, h2 { font-family: Georgia, 'Times New Roman', serif; font-weight: 500; }
a { color: var(--accent); }
nav { line-height: 2; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 16px 20px; margin: 24px 0; }
.card header h2 { margin: 0; }
.latin { color: var(--muted); font-style: italic; margin: 0; }
.badge { display: inline-block; margin-top: 8px; padding: 2px 10px; border-radius: 999px; font-size: 13px; }
.badge.draft { background: #f7e3b8; color: #6b4a07; }
.badge.checked { background: #d6ecc4; color: #27500a; }
.photos { display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0; }
figure { margin: 0; max-width: 300px; }
figure img { width: 100%; border-radius: 12px; display: block; }
figcaption { font-size: 12px; color: var(--muted); }
dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; }
dt { color: var(--muted); }
dd { margin: 0; }
.ev { border-left: 4px solid var(--line); padding-left: 10px; margin: 8px 0; list-style: none; }
.legend .ev { display: inline-block; margin-right: 12px; }
.ev-proven { border-color: var(--proven); }
.ev-traditional { border-color: var(--traditional); }
.ev-folk { border-color: var(--folk); }
.ev-refuted { border-color: var(--refuted); }
.indications { padding-left: 0; }
.refs a { font-size: 13px; text-decoration: none; }
.safety-contraindicated { color: var(--refuted); font-weight: 600; }
.safety-caution { color: var(--traditional); }
.lookalikes .poison { border: 2px solid var(--refuted); border-radius: 12px; padding: 8px 12px; list-style: none; margin: 8px 0; }
.poison-label { color: var(--refuted); font-weight: 600; }
.sources li { margin: 6px 0; }
.section { margin-top: 40px; }
`;

/** HTML-страница для проверки базы человеком: все травы, сборы и источники. */
export function renderReport(content: LoadedContent, opts: ReportOptions): string {
  const dictionaryNames = new Map<DictionaryKey, Map<string, string>>(
    (Object.keys(content.dictionaries) as DictionaryKey[]).map((key) => [
      key,
      new Map(content.dictionaries[key].map((item) => [item.id, item.name])),
    ]),
  );
  const name = (key: DictionaryKey, id: string) => e(dictionaryNames.get(key)?.get(id) ?? id);
  const herbs = [...content.herbs].sort(byId);
  const herbName = new Map(herbs.map((h) => [h.id, h.name]));
  const sources = [...content.sources].sort(byId);
  const sourceNumber = new Map(sources.map((s, i) => [s.id, i + 1]));
  const organSystemOf = new Map(content.dictionaries.indications.map((x) => [x.id, x.organ_system]));
  const classOf = new Map(content.dictionaries.substances.map((x) => [x.id, x.class]));

  function refs(list: SourceRef[]): string {
    if (list.length === 0) return '';
    const links = list.map((r) => {
      const page = r.page ? `, с. ${e(r.page)}` : '';
      return `<a href="#src-${e(r.id)}">[${sourceNumber.get(r.id) ?? '?'}${page}]</a>`;
    });
    return ` <span class="refs">${links.join(' ')}</span>`;
  }

  function figure(herbId: string, photo: PhotoRef, alt: string): string {
    const meta = content.photoMeta[herbId]?.[photo.file];
    const credit = meta
      ? ` · ${e(meta.author)} · ${e(meta.license)} · <a href="${e(meta.source_url)}">страница файла</a>`
      : '';
    const caption = photo.caption ? `: ${e(photo.caption)}` : '';
    const src = e(opts.photoUrl(herbId, photo.file));
    return `<figure><img src="${src}" alt="${e(alt)}" loading="lazy"><figcaption>${PHOTO_KIND_LABELS[photo.kind]}${caption}${credit}</figcaption></figure>`;
  }

  const list = (items: string[]) => (items.length ? `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>` : '<p>—</p>');
  const safety = (label: string, status: SafetyStatus, text = SAFETY_STATUS_LABELS[status]) =>
    `<li>${label}: <span class="safety-${status}">${text}</span></li>`;

  function renderHerb(h: HerbInput): string {
    const { children } = h.safety;
    const childrenText =
      children.status === 'ok' && children.from_age !== undefined
        ? `${SAFETY_STATUS_LABELS.ok} с ${children.from_age} ${children.from_age === 1 ? 'года' : 'лет'}`
        : SAFETY_STATUS_LABELS[children.status];

    const indications = h.indications.map((x) => {
      const system = organSystemOf.get(x.indication);
      const systemText = system ? ` <em>(${name('organSystems', system)})</em>` : '';
      return `<li class="ev ev-${x.evidence.level}"><strong>${name('indications', x.indication)}</strong>${systemText} — ${EVIDENCE_LABELS[x.evidence.level]}<br><small>${e(x.evidence.note)}</small>${refs(x.sources)}</li>`;
    });
    const substances = h.substances.map((id) => {
      const cls = classOf.get(id);
      return `${name('substances', id)}${cls ? ` (${name('substanceClasses', cls)})` : ''}`;
    });
    const harvest = h.harvest.map(
      (x) =>
        `<strong>${name('plantParts', x.part)}</strong> · ${x.months.map(monthName).join(', ')} · ${e(x.how)} · Сушка: ${e(x.drying)} · Хранение: ${e(x.storage)}${refs(x.sources)}`,
    );
    const usage = h.usage.map((u) => {
      const forWhat = u.for_indications.length
        ? ` (${u.for_indications.map((id) => name('indications', id)).join(', ')})`
        : '';
      const course = u.course ? ` · Курс: ${e(u.course)}` : '';
      return `<strong>${USAGE_FORM_LABELS[u.form]}</strong>${forWhat} · ${e(u.recipe)} · Дозировка: ${e(u.dosage)}${course}${refs(u.sources)}`;
    });
    const safetyItems = [
      safety('Беременность', h.safety.pregnancy),
      safety('Кормление грудью', h.safety.lactation),
      safety('Дети', children.status, childrenText),
      `<li>Токсичность: ${TOXICITY_LABELS[h.safety.toxicity]}</li>`,
      ...h.safety.contraindications.map((x) => `<li>Противопоказание: ${e(x)}</li>`),
      ...h.safety.warnings.map((x) => `<li>Предостережение: ${e(x)}</li>`),
      ...h.safety.side_effects.map((x) => `<li>Побочное действие: ${e(x)}</li>`),
      ...h.safety.interactions.map((x) => `<li>Взаимодействие: ${e(x)}</li>`),
    ];
    const lookalikes = h.lookalikes.map((l) => {
      const title = l.herb ? e(herbName.get(l.herb) ?? l.herb) : `${e(l.name ?? '')} <em>${e(l.latin ?? '')}</em>`;
      const poison = l.poisonous ? ' <span class="poison-label">ядовит</span>' : '';
      const alt = l.name ?? herbName.get(l.herb ?? '') ?? '';
      const photo = l.photo ? figure(h.id, l.photo, alt) : '';
      return `<li class="${l.poisonous ? 'poison' : ''}"><strong>${title}</strong>${poison} — ${e(l.differences)}${photo}</li>`;
    });

    return `<article class="card" id="herb-${e(h.id)}">
<header><h2>${e(h.name)}</h2><p class="latin">${e(h.latin)} · ${name('families', h.family)}</p><span class="badge ${h.status}">${HERB_STATUS_LABELS[h.status]}</span></header>
<div class="photos">${h.photos.map((p) => figure(h.id, p, h.name)).join('')}</div>
<dl>
<dt>Другие названия</dt><dd>${h.other_names.map((x) => e(x)).join(', ') || '—'}</dd>
<dt>Жизненная форма</dt><dd>${LIFE_FORM_LABELS[h.life_form]}</dd>
<dt>Где взять</dt><dd>${h.sourcing.map((s) => SOURCING_LABELS[s]).join(', ')}</dd>
<dt>Где растёт</dt><dd>${h.habitats.map((id) => name('habitats', id)).join(', ') || '—'}</dd>
</dl>
<h3>Как узнать</h3><p>${e(h.description)}</p>
<h3>От чего помогает</h3><ul class="indications">${indications.join('')}</ul>
<h3>Действующие вещества</h3><p>${substances.join(', ') || '—'}</p>
<h3>Действие</h3><p>${h.actions.map((id) => name('actions', id)).join(', ') || '—'}</p>
<h3>Сбор</h3>${list(harvest)}
<h3>Применение</h3>${list(usage)}
<h3>Безопасность</h3><ul>${safetyItems.join('')}</ul>${refs(h.safety.sources)}
${lookalikes.length ? `<h3>С чем можно спутать</h3><ul class="lookalikes">${lookalikes.join('')}</ul>` : ''}
${h.sources.length ? `<p>Общие источники:${refs(h.sources)}</p>` : ''}
</article>`;
  }

  function renderRecipe(r: Recipe): string {
    const components = r.components.map((c) => {
      const part = c.part ? ` (${name('plantParts', c.part)})` : '';
      return `${e(herbName.get(c.herb) ?? c.herb)} — ${c.parts} ч.${part}`;
    });
    return `<article class="card" id="recipe-${e(r.id)}">
<header><h2>${e(r.name)}</h2><p class="latin">При: ${r.purpose.map((id) => name('indications', id)).join(', ')}</p></header>
<h3>Состав</h3>${list(components)}
<h3>Приготовление</h3><p>${e(r.preparation)}</p>
<h3>Дозировка</h3><p>${e(r.dosage)}</p>
<p class="ev ev-${r.evidence.level}">${EVIDENCE_LABELS[r.evidence.level]}<br><small>${e(r.evidence.note)}</small>${refs(r.sources)}</p>
${r.safety_note ? `<p><strong>Осторожно:</strong> ${e(r.safety_note)}</p>` : ''}
</article>`;
  }

  function renderSource(s: Source, index: number): string {
    const where = [s.journal, s.publisher].filter((x): x is string => Boolean(x)).map((x) => e(x)).join(', ');
    const href = sourceHref(s);
    const link = href ? ` <a href="${e(href)}">${e(href)}</a>` : '';
    const isbn = s.isbn ? ` ISBN ${e(s.isbn)}.` : '';
    return `<li id="src-${e(s.id)}" value="${index + 1}">${s.authors.map((x) => e(x)).join(', ')}. ${e(s.title)}.${where ? ` ${where},` : ''} ${s.year}. <em>${SOURCE_TYPE_LABELS[s.type]}</em>.${isbn}${link}</li>`;
  }

  const generated = `${opts.generatedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
  const legend = (['proven', 'traditional', 'folk', 'refuted'] as const)
    .map((level) => `<span class="ev ev-${level}">${EVIDENCE_LABELS[level]}</span>`)
    .join(' ');
  const toc = herbs.map((h) => `<a href="#herb-${e(h.id)}">${e(h.name)}</a>`).join(' · ');
  const recipes = [...content.recipes].sort(byId);

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Травы — проверка базы</title>
<style>${STYLE}</style>
</head>
<body>
<header class="top">
<h1>Травы — проверка базы</h1>
<p>Сформировано: ${generated} · трав: ${herbs.length} · сборов: ${recipes.length} · источников: ${sources.length}</p>
<p class="legend">${legend}</p>
<nav>${toc}</nav>
</header>
<main>
${herbs.map((h) => renderHerb(h)).join('\n')}
${recipes.length ? `<h2 class="section">Сборы</h2>\n${recipes.map((r) => renderRecipe(r)).join('\n')}` : ''}
<h2 class="section">Источники</h2>
<ol class="sources">${sources.map((s, i) => renderSource(s, i)).join('')}</ol>
</main>
</body>
</html>
`;
}
