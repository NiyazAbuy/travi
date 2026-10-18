import { describe, expect, it } from 'vitest';
import { validateContent, type PhotoExists } from '../src/validate';
import { emptyTree, parseTree, sampleTree } from './helpers';

const allPhotosExist: PhotoExists = () => true;

function validate(tree = sampleTree(), photoExists = allPhotosExist) {
  return validateContent(parseTree(tree), photoExists);
}

describe('validateContent', () => {
  it('корректное дерево — без ошибок', () => {
    expect(validate()).toEqual([]);
  });

  it('пустая база — без ошибок', () => {
    expect(validate(emptyTree())).toEqual([]);
  });

  it('неизвестное семейство', () => {
    const tree = sampleTree();
    tree.herbs[0]!.family = 'no-such-family';
    expect(validate(tree)).toEqual([
      {
        file: 'herbs/plantago-major.yaml',
        path: 'family',
        message: 'неизвестный id "no-such-family" — его нет в dictionaries/families.yaml',
      },
    ]);
  });

  it('неизвестный источник у показания', () => {
    const tree = sampleTree();
    tree.herbs[0]!.indications[0]!.sources = [{ id: 'no-such-source' }];
    expect(validate(tree)).toContainEqual({
      file: 'herbs/plantago-major.yaml',
      path: 'indications.0.sources.0.id',
      message: 'неизвестный id "no-such-source" — его нет в sources.yaml',
    });
  });

  it('proven только с книгой — ошибка; с РКИ — нет', () => {
    const tree = sampleTree();
    tree.herbs[0]!.indications[0]!.evidence.level = 'proven';
    tree.herbs[0]!.indications[0]!.sources = [{ id: 'book-test' }];
    expect(validate(tree)).toEqual([
      {
        file: 'herbs/plantago-major.yaml',
        path: 'indications.0',
        message:
          'для уровня доказанности "proven" нужен хотя бы один источник типа: systematic_review, rct, article, monograph',
      },
    ]);
    tree.herbs[0]!.indications[0]!.sources = [{ id: 'book-test' }, { id: 'rct-test' }];
    expect(validate(tree)).toEqual([]);
  });

  it('refuted только с монографией — ошибка', () => {
    const tree = sampleTree();
    tree.herbs[0]!.indications[0]!.evidence.level = 'refuted';
    expect(validate(tree).map((e) => e.path)).toEqual(['indications.0']);
  });

  it('правило доказанности проверяется и у сборов', () => {
    const tree = sampleTree();
    tree.recipes[0]!.evidence.level = 'proven';
    expect(validate(tree)).toContainEqual(
      expect.objectContaining({ file: 'recipes/chest-blend.yaml', path: 'evidence' }),
    );
  });

  it('повторяющийся id источника', () => {
    const tree = sampleTree();
    tree.sources.push({ ...tree.sources[0]! });
    expect(validate(tree)).toEqual([{ file: 'sources.yaml', path: '3', message: 'id "book-test" повторяется' }]);
  });

  it('одно показание дважды в траве', () => {
    const tree = sampleTree();
    tree.herbs[0]!.indications.push({ ...tree.herbs[0]!.indications[0]! });
    expect(validate(tree)).toContainEqual({
      file: 'herbs/plantago-major.yaml',
      path: 'indications.1.indication',
      message: 'показание "cough" указано дважды — объедините записи',
    });
  });

  it('словарь показаний ссылается на неизвестную систему органов', () => {
    const tree = sampleTree();
    tree.dictionaries.indications[0]!.organ_system = 'no-such-system';
    expect(validate(tree)).toEqual([
      {
        file: 'dictionaries/indications.yaml',
        path: '0.organ_system',
        message: 'неизвестный id "no-such-system" — его нет в dictionaries/organ-systems.yaml',
      },
    ]);
  });

  it('файла фото нет на диске', () => {
    const errors = validate(sampleTree(), (herbId) => herbId !== 'plantago-major');
    expect(errors).toEqual([
      { file: 'herbs/plantago-major.yaml', path: 'photos.0', message: 'файл photos/plantago-major/plant.webp не найден' },
    ]);
  });

  it('нет автора и лицензии для фото', () => {
    const tree = sampleTree();
    tree.photos['plantago-major']!.meta = {};
    expect(validate(tree)).toEqual([
      {
        file: 'herbs/plantago-major.yaml',
        path: 'photos.0',
        message: 'нет записи об авторе и лицензии для plant.webp в photos/plantago-major/photos.yaml',
      },
    ]);
  });

  describe('illustration', () => {
    const withIllustration = () => {
      const tree = sampleTree();
      Object.assign(tree.herbs[0]!, { illustration: { file: 'illustration.webp', kind: 'plant' } });
      tree.photos['plantago-major']!.meta = {
        ...tree.photos['plantago-major']!.meta,
        'illustration.webp': { author: 'Köhler', license: 'PD', source_url: 'https://commons.wikimedia.org/wiki/File:K.jpg' },
      };
      return tree;
    };

    it('рисунок с записью в photos.yaml — без ошибок', () => {
      expect(validate(withIllustration())).toEqual([]);
    });

    it('нет автора и лицензии для рисунка', () => {
      const tree = withIllustration();
      delete (tree.photos['plantago-major']!.meta as Record<string, unknown>)['illustration.webp'];
      expect(validate(tree)).toEqual([
        {
          file: 'herbs/plantago-major.yaml',
          path: 'illustration',
          message: 'нет записи об авторе и лицензии для illustration.webp в photos/plantago-major/photos.yaml',
        },
      ]);
    });

    it('файла рисунка нет на диске', () => {
      const errors = validate(withIllustration(), (_herbId, file) => file !== 'illustration.webp');
      expect(errors).toEqual([
        {
          file: 'herbs/plantago-major.yaml',
          path: 'illustration',
          message: 'файл photos/plantago-major/illustration.webp не найден',
        },
      ]);
    });
  });

  it('трава не может быть двойником самой себя', () => {
    const tree = sampleTree();
    tree.herbs[0]!.lookalikes = [{ herb: 'plantago-major', poisonous: false, differences: 'Отличия' }];
    expect(validate(tree)).toEqual([
      {
        file: 'herbs/plantago-major.yaml',
        path: 'lookalikes.0.herb',
        message: 'трава не может быть двойником самой себя',
      },
    ]);
  });

  it('двойник ссылается на неизвестную траву, а его фото проверяется', () => {
    const tree = sampleTree();
    tree.herbs[0]!.lookalikes = [
      { herb: 'no-such-herb', poisonous: true, differences: 'Отличия', photo: { file: 'twin.webp', kind: 'plant' } },
    ];
    expect(validate(tree).map((e) => e.path)).toEqual(['lookalikes.0.herb', 'lookalikes.0.photo']);
  });

  it('сбор ссылается на неизвестную траву', () => {
    const tree = sampleTree();
    tree.recipes[0]!.components[0]!.herb = 'no-such-herb';
    expect(validate(tree)).toEqual([
      {
        file: 'recipes/chest-blend.yaml',
        path: 'components.0.herb',
        message: 'неизвестный id "no-such-herb" — его нет в herbs/',
      },
    ]);
  });

  it('способ применения ссылается на неизвестное показание', () => {
    const tree = sampleTree();
    Object.assign(tree.herbs[0]!.usage[0]!, { for_indications: ['no-such-indication'] });
    expect(validate(tree).map((e) => e.path)).toEqual(['usage.0.for_indications.0']);
  });
});
