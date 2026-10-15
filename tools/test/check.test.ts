import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkContent } from '../src/check';
import { cleanupTempDirs, emptyTree, sampleTree, writeContentTree } from './helpers';

afterEach(cleanupTempDirs);

describe('checkContent', () => {
  it('корректное дерево — без ошибок', async () => {
    const { errors } = await checkContent(await writeContentTree(sampleTree()));
    expect(errors).toEqual([]);
  });

  it('пустая база — без ошибок', async () => {
    const { content, errors } = await checkContent(await writeContentTree(emptyTree()));
    expect(errors).toEqual([]);
    expect(content.herbs).toEqual([]);
  });

  it('при ошибке загрузки не показывает каскадных ошибок ссылок', async () => {
    const dir = await writeContentTree(sampleTree());
    await writeFile(path.join(dir, 'herbs', 'althaea-officinalis.yaml'), 'id: [сломано\n');
    const { errors } = await checkContent(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe('herbs/althaea-officinalis.yaml');
  });

  it('находит отсутствующий на диске файл фото', async () => {
    const dir = await writeContentTree(sampleTree());
    await rm(path.join(dir, 'photos', 'plantago-major', 'plant.webp'));
    const { errors } = await checkContent(dir);
    expect(errors.map((e) => e.message)).toEqual(['файл photos/plantago-major/plant.webp не найден']);
  });
});
