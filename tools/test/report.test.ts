import { describe, expect, it } from 'vitest';
import { EVIDENCE_LABELS, type Source } from '@travy/shared';
import { escapeHtml, renderReport, sourceHref } from '../src/report';
import { parseTree, sampleTree } from './helpers';

const opts = {
  photoUrl: (herbId: string, file: string) => `../content/photos/${herbId}/${file}`,
  generatedAt: new Date('2026-10-15T18:30:00Z'),
};

function render(tree = sampleTree()) {
  return renderReport(parseTree(tree), opts);
}

describe('renderReport', () => {
  it('сводка вверху страницы', () => {
    const html = render();
    expect(html).toContain('Сформировано: 2026-10-15 18:30 UTC');
    expect(html).toContain('трав: 2');
    expect(html).toContain('сборов: 1');
    expect(html).toContain('источников: 3');
  });

  it('трава: название, латынь, семейство и плашка черновика', () => {
    const html = render();
    expect(html).toContain('<h2>Подорожник большой</h2>');
    expect(html).toContain('Testus herbus L. · Подорожниковые');
    expect(html).toContain('<span class="badge draft">Черновик — не проверено</span>');
  });

  it('названия из словарей вместо id', () => {
    const html = render();
    expect(html).toContain('<strong>Кашель</strong> <em>(Дыхательная система)</em>');
    expect(html).toContain('Слизи (Полисахариды)');
    expect(html).toContain('Отхаркивающее');
    expect(html).toContain('<dd>Луг</dd>');
  });

  it('жизненная форма и где взять', () => {
    const html = render();
    expect(html).toContain('<dd>Трава</dd>');
    expect(html).toContain('<dd>Дикорастущее, Аптечное</dd>');
  });

  it('уровень доказанности с цветом и пояснением', () => {
    const html = render();
    expect(html).toContain('class="ev ev-traditional"');
    expect(html).toContain(EVIDENCE_LABELS.traditional);
    expect(html).toContain('Монография EMA, традиционное применение');
  });

  it('сбор: месяцы по-русски и ссылка на источник со страницей', () => {
    const html = render();
    expect(html).toContain('июнь, июль, август');
    // источники нумеруются по id: book-test = 1, ema-plantago = 2, rct-test = 3
    expect(html).toContain('<a href="#src-book-test">[1, с. 12]</a>');
  });

  it('список источников: DOI и URL кликабельны, ISBN показан', () => {
    const html = render();
    expect(html).toContain('<li id="src-book-test" value="1">');
    expect(html).toContain('ISBN 978-5-00-000000-0');
    expect(html).toContain('href="https://doi.org/10.1000/test.2020.1"');
    expect(html).toContain('href="https://www.ema.europa.eu/en/medicines/herbal/plantaginis-lanceolatae-folium"');
  });

  it('фото: адрес из photoUrl, автор и лицензия', () => {
    const html = render();
    expect(html).toContain('src="../content/photos/plantago-major/plant.webp"');
    expect(html).toContain('Test Author · CC BY-SA 4.0');
  });

  it('рисунок травы: маленький, рядом с фото, с автором и лицензией', () => {
    const tree = sampleTree();
    Object.assign(tree.herbs[0]!, { illustration: { file: 'illustration.webp', kind: 'plant' } });
    tree.photos['plantago-major']!.meta['illustration.webp'] = {
      author: 'Otto Wilhelm Thomé',
      license: 'PD',
      source_url: 'https://commons.wikimedia.org/wiki/File:Plantago.jpg',
    };
    const html = render(tree);
    expect(html).toContain(
      '<figure class="illustration"><img src="../content/photos/plantago-major/illustration.webp" alt="Рисунок: Подорожник большой" loading="lazy"><figcaption>Рисунок · Otto Wilhelm Thomé · PD',
    );
    // рисунок — первым в ряду фото
    expect(html.indexOf('illustration.webp')).toBeLessThan(html.indexOf('plantago-major/plant.webp'));
  });

  it('без рисунка — только фото', () => {
    expect(render()).not.toContain('class="illustration"');
  });

  it('двойник: ядовитый выделен, имя травы из базы', () => {
    const tree = sampleTree();
    tree.herbs[0]!.lookalikes = [{ herb: 'althaea-officinalis', poisonous: true, differences: 'Отличия' }];
    const html = render(tree);
    expect(html).toContain('<li class="poison"><strong>Алтей лекарственный</strong> <span class="poison-label">ядовит</span>');
  });

  it('сборы: состав с названиями трав и частей', () => {
    const html = render();
    expect(html).toContain('<h2>Грудной сбор (тест)</h2>');
    expect(html).toContain('Подорожник большой — 2 ч. (Лист)');
  });

  it('экранирует HTML из данных', () => {
    const tree = sampleTree();
    tree.herbs[0]!.description = '<script>alert(1)</script>';
    const html = render(tree);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('предостережения отдельно от противопоказаний', () => {
    const tree = sampleTree();
    Object.assign(tree.herbs[0]!.safety, {
      contraindications: ['Аллергия на астровые'],
      warnings: ['При желчнокаменной болезни — с осторожностью'],
    });
    const html = render(tree);
    expect(html).toContain('<li>Противопоказание: Аллергия на астровые</li>');
    expect(html).toContain('<li>Предостережение: При желчнокаменной болезни — с осторожностью</li>');
  });
});

describe('escapeHtml', () => {
  it('экранирует пять спецсимволов', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});

describe('sourceHref', () => {
  const base: Source = { id: 's', type: 'rct', title: 'T', authors: ['A'], year: 2020 };
  it('DOI в любой форме → doi.org', () => {
    expect(sourceHref({ ...base, doi: 'https://doi.org/10.1/ABC' })).toBe('https://doi.org/10.1/abc');
  });
  it('PMID → PubMed', () => {
    expect(sourceHref({ ...base, pmid: 'PMID: 123' })).toBe('https://pubmed.ncbi.nlm.nih.gov/123/');
  });
  it('иначе url, у книги с ISBN ссылки нет', () => {
    expect(sourceHref({ ...base, url: 'https://example.org/a' })).toBe('https://example.org/a');
    expect(sourceHref({ ...base, isbn: '978-5-00-000000-0' })).toBeUndefined();
  });
});
