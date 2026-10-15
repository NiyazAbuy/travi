import { describe, expect, it } from 'vitest';
import type { Source } from '@travy/shared';
import {
  normalizeDoi,
  normalizePmid,
  parseCrossrefTitle,
  parsePubmedTitle,
  titlesMatch,
  verifySource,
  verifySources,
} from '../src/verify-sources';

const TITLE = 'Chamomile extract for generalized anxiety disorder';

function source(extra: Partial<Source>): Source {
  return { id: 'test-2009', type: 'rct', title: TITLE, authors: ['Amsterdam J. D.'], year: 2009, ...extra };
}

function fakeFetch(routes: Record<string, () => Response>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    const prefix = Object.keys(routes).find((p) => url.startsWith(p));
    if (!prefix) throw new Error(`неожиданный запрос: ${url}`);
    return routes[prefix]!();
  }) as typeof fetch;
}

const crossref = (title: string) => () => Response.json({ message: { title: [title] } });
const pubmed = (pmid: string, title: string) => () => Response.json({ result: { uids: [pmid], [pmid]: { title } } });

describe('нормализация идентификаторов', () => {
  it.each([
    ['10.1097/JCP.0b013e3181ac9348', '10.1097/jcp.0b013e3181ac9348'],
    ['https://doi.org/10.1097/JCP.0b013e3181ac9348', '10.1097/jcp.0b013e3181ac9348'],
    ['http://dx.doi.org/10.1/ABC', '10.1/abc'],
    ['doi: 10.1/ABC', '10.1/abc'],
  ])('normalizeDoi(%s)', (raw, expected) => {
    expect(normalizeDoi(raw)).toBe(expected);
  });

  it.each([
    ['19593179', '19593179'],
    ['PMID: 19593179', '19593179'],
    ['pmid19593179', '19593179'],
    ['abc', null],
  ])('normalizePmid(%s)', (raw, expected) => {
    expect(normalizePmid(raw)).toBe(expected);
  });
});

describe('titlesMatch', () => {
  it('регистр, пунктуация и точка в конце не важны', () => {
    expect(titlesMatch(TITLE, 'Chamomile Extract for Generalized Anxiety Disorder.')).toBe(true);
  });
  it('HTML-теги Crossref не мешают', () => {
    expect(titlesMatch('Effect of Matricaria chamomilla', 'Effect of <i>Matricaria chamomilla</i>')).toBe(true);
  });
  it('подзаголовок не мешает', () => {
    expect(titlesMatch(TITLE, `${TITLE}: a randomized, double-blind trial`)).toBe(true);
  });
  it('разные статьи не совпадают', () => {
    expect(titlesMatch(TITLE, 'Valerian for insomnia in older adults')).toBe(false);
  });
});

describe('разбор ответов', () => {
  it('Crossref', () => {
    expect(parseCrossrefTitle({ message: { title: [TITLE] } })).toBe(TITLE);
    expect(parseCrossrefTitle({ message: {} })).toBeNull();
  });
  it('PubMed', () => {
    expect(parsePubmedTitle({ result: { '1': { title: TITLE } } }, '1')).toBe(TITLE);
    expect(parsePubmedTitle({ result: { '1': { error: 'cannot get document summary' } } }, '1')).toBeNull();
  });
});

describe('verifySource', () => {
  it('DOI совпадает (DOI записан ссылкой)', async () => {
    const fetchFn = fakeFetch({ 'https://api.crossref.org/works/10.1097/jcp': crossref(`${TITLE}.`) });
    const results = await verifySource(source({ doi: 'https://doi.org/10.1097/JCP.0b013e3181ac9348' }), fetchFn);
    expect(results).toEqual([
      { sourceId: 'test-2009', kind: 'doi', value: '10.1097/jcp.0b013e3181ac9348', status: 'ok', found: `${TITLE}.` },
    ]);
  });

  it('DOI не найден', async () => {
    const fetchFn = fakeFetch({ 'https://api.crossref.org/works/': () => new Response('', { status: 404 }) });
    const [result] = await verifySource(source({ doi: '10.1/none' }), fetchFn);
    expect(result!.status).toBe('not_found');
  });

  it('PMID ведёт на другую статью (PMID записан с префиксом)', async () => {
    const fetchFn = fakeFetch({
      'https://eutils.ncbi.nlm.nih.gov/': pubmed('19593179', 'Valerian for insomnia in older adults.'),
    });
    const [result] = await verifySource(source({ pmid: 'PMID: 19593179' }), fetchFn);
    expect(result).toMatchObject({ kind: 'pmid', value: '19593179', status: 'mismatch' });
  });

  it('некорректный PMID — ошибка без запроса в сеть', async () => {
    const [result] = await verifySource(source({ pmid: 'abc' }), fakeFetch({}));
    expect(result).toMatchObject({ status: 'error', detail: 'PMID должен состоять из цифр' });
  });

  it('сетевая ошибка не роняет проверку', async () => {
    const fetchFn = (async () => {
      throw new Error('ECONNRESET');
    }) as typeof fetch;
    const [result] = await verifySource(source({ doi: '10.1/x' }), fetchFn);
    expect(result).toMatchObject({ status: 'error', detail: 'ECONNRESET' });
  });

  it('зависший сервер не вешает проверку: запрос прерывается по таймауту', async () => {
    const hanging = ((_input: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
      })) as typeof fetch;
    const [result] = await verifySource(source({ doi: '10.1/x' }), hanging, 50);
    expect(result).toMatchObject({ status: 'error' });
    expect(result!.detail).toMatch(/нет ответа/);
  }, 3000);

  it('источник только с ISBN не проверяется', async () => {
    expect(await verifySource(source({ isbn: '978-5-00-000000-0' }), fakeFetch({}))).toEqual([]);
  });
});

describe('verifySources', () => {
  it('проверяет все источники по очереди', async () => {
    const fetchFn = fakeFetch({
      'https://api.crossref.org/works/': crossref(TITLE),
      'https://eutils.ncbi.nlm.nih.gov/': pubmed('1', TITLE),
    });
    const results = await verifySources(
      [source({ id: 'a', doi: '10.1/a' }), source({ id: 'b', pmid: '1' }), source({ id: 'c', isbn: 'x' })],
      fetchFn,
      0,
    );
    expect(results.map((r) => [r.sourceId, r.status])).toEqual([
      ['a', 'ok'],
      ['b', 'ok'],
    ]);
  });
});
