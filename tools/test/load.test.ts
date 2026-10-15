import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import { loadContent } from '../src/load';
import { sampleHerb, sampleRecipe } from '../../shared/test/sample';
import { cleanupTempDirs, sampleTree, writeContentTree } from './helpers';

afterEach(cleanupTempDirs);

describe('loadContent', () => {
  it('загружает корректное дерево без ошибок', async () => {
    const dir = await writeContentTree(sampleTree());
    const { content, errors } = await loadContent(dir);
    expect(errors).toEqual([]);
    expect(content.herbs.map((h) => h.id)).toEqual(['althaea-officinalis', 'plantago-major']);
    expect(content.recipes.map((r) => r.id)).toEqual(['chest-blend']);
    expect(content.sources).toHaveLength(3);
    expect(content.dictionaries.indications[1]!.synonyms).toEqual([]);
    expect(content.photoMeta['plantago-major']!['plant.webp']!.license).toBe('CC BY-SA 4.0');
  });

  it('сообщает о синтаксической ошибке YAML и продолжает загрузку остального', async () => {
    const dir = await writeContentTree(sampleTree());
    await writeFile(path.join(dir, 'herbs', 'plantago-major.yaml'), 'id: plantago-major\nname: [незакрытый\n');
    const { content, errors } = await loadContent(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe('herbs/plantago-major.yaml');
    expect(errors[0]!.message).toMatch(/^ошибка YAML/);
    expect(content.herbs.map((h) => h.id)).toEqual(['althaea-officinalis']);
  });

  it('сообщает об ошибке схемы с путём к полю', async () => {
    const tree = sampleTree();
    tree.herbs[0]!.indications[0]!.sources = [];
    const { errors } = await loadContent(await writeContentTree(tree));
    expect(errors).toContainEqual({
      file: 'herbs/plantago-major.yaml',
      path: 'indications.0.sources',
      message: 'нужен хотя бы один источник',
    });
  });

  it('требует совпадения id и имени файла', async () => {
    const dir = await writeContentTree(sampleTree());
    await writeFile(path.join(dir, 'herbs', 'plantago.yaml'), stringify(sampleHerb('plantago-major', 'Дубль')));
    const { errors } = await loadContent(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ file: 'herbs/plantago.yaml', path: 'id' });
    expect(errors[0]!.message).toMatch(/не совпадает с именем файла/);
  });

  it('файл с кириллическим именем даёт понятную ошибку, а не пропадает', async () => {
    const dir = await writeContentTree(sampleTree());
    await writeFile(path.join(dir, 'herbs', 'ромашка.yaml'), stringify(sampleHerb('matricaria-chamomilla', 'Ромашка')));
    const { errors } = await loadContent(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe('herbs/ромашка.yaml');
    expect(errors[0]!.message).toMatch(/не совпадает с именем файла/);
  });

  it('читает файлы с BOM и переводами строк CRLF (сохранённые в Windows)', async () => {
    const tree = sampleTree();
    const dir = await writeContentTree(tree);
    const windowsText = `\uFEFF${stringify(tree.sources).replace(/\n/g, '\r\n')}`;
    await writeFile(path.join(dir, 'sources.yaml'), windowsText);
    const { content, errors } = await loadContent(dir);
    expect(errors).toEqual([]);
    expect(content.sources.map((s) => s.id)).toEqual(['book-test', 'ema-plantago', 'rct-test']);
  });

  it('пустой файл списка — это пустой список', async () => {
    const dir = await writeContentTree(sampleTree());
    await writeFile(path.join(dir, 'sources.yaml'), '');
    const { content, errors } = await loadContent(dir);
    expect(errors).toEqual([]);
    expect(content.sources).toEqual([]);
  });

  it('сообщает об отсутствующем файле словаря', async () => {
    const dir = await writeContentTree(sampleTree());
    await rm(path.join(dir, 'dictionaries', 'habitats.yaml'));
    const { errors } = await loadContent(dir);
    expect(errors).toEqual([{ file: 'dictionaries/habitats.yaml', message: 'файл не найден' }]);
  });

  it('ошибка в элементе списка указывает номер и id элемента', async () => {
    const tree = sampleTree();
    tree.sources[1]!.title = '';
    const { content, errors } = await loadContent(await writeContentTree(tree));
    expect(errors).toEqual([{ file: 'sources.yaml', path: '1 (ema-plantago).title', message: 'не должно быть пустым' }]);
    expect(content.sources.map((s) => s.id)).toEqual(['book-test', 'rct-test']);
  });

  it('список вместо словаря — понятная ошибка', async () => {
    const dir = await writeContentTree(sampleTree());
    await writeFile(path.join(dir, 'sources.yaml'), 'id: book-test\n');
    const { errors } = await loadContent(dir);
    expect(errors[0]!.message).toMatch(/ожидался список/);
  });

  it('файлы с другим расширением не пропадают молча', async () => {
    const dir = await writeContentTree(sampleTree());
    const herb = stringify(sampleHerb('matricaria-chamomilla', 'Ромашка'));
    await writeFile(path.join(dir, 'herbs', 'matricaria-chamomilla.yml'), herb);
    await writeFile(path.join(dir, 'herbs', 'ромашка.YAML'), herb);
    await writeFile(path.join(dir, 'herbs', 'calendula.yaml.txt'), herb);
    await writeFile(path.join(dir, 'recipes', 'blend.yml'), stringify(sampleRecipe()));
    await writeFile(path.join(dir, 'herbs', '.gitkeep'), '');
    const { errors } = await loadContent(dir);
    expect(errors.map((e) => e.file).sort()).toEqual([
      'herbs/calendula.yaml.txt',
      'herbs/matricaria-chamomilla.yml',
      'herbs/ромашка.YAML',
      'recipes/blend.yml',
    ]);
    expect(errors[0]!.message).toMatch(/ожидается расширение \.yaml/);
  });

  it('встроенные сообщения zod тоже на русском', async () => {
    const dir = await writeContentTree(sampleTree());
    const herb = { ...sampleHerb('plantago-major', 'Подорожник большой'), nmae: 'опечатка', status: 'готово' };
    await writeFile(path.join(dir, 'herbs', 'plantago-major.yaml'), stringify(herb));
    const { errors } = await loadContent(dir);
    const text = errors.map((e) => e.message).join('\n');
    expect(text).toMatch(/Нераспознанный ключ: "nmae"/);
    expect(text).toMatch(/Неверный вариант/);
  });
});
