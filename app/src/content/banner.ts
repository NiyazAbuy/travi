/**
 * Картина для баннера на главной («Природа — лучшая аптека»). Встроена в приложение, не часть базы трав.
 * Авторство показывается в «О приложении» так же, как у фото: автор · лицензия, ссылка на страницу файла.
 *
 * Источник: Wikimedia Commons, «Туманное утро. Шишкин И.И..jpg» (оригинал 1000×741); вырезка 2:1 —
 * x 0, y 175, 1000×500 (без подписи художника в левом нижнем углу), WebP. Подробнее — docs/design/travnitsa/README.md.
 */
export interface BannerPainting {
  /** Картинка для `<Image source>` (ресурс, встроенный сборщиком). */
  source: number;
  /** Название картины. */
  title: string;
  author: string;
  year: number;
  /** Код лицензии в том же виде, что у фото в базе (`PD` — общественное достояние). */
  license: string;
  /** Страница файла на Wikimedia Commons. */
  sourceUrl: string;
}

export const BANNER: BannerPainting = {
  source: require('../../assets/images/banner.webp'),
  title: 'Туманное утро',
  author: 'Иван Шишкин',
  year: 1885,
  license: 'PD',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:%D0%A2%D1%83%D0%BC%D0%B0%D0%BD%D0%BD%D0%BE%D0%B5_%D1%83%D1%82%D1%80%D0%BE._%D0%A8%D0%B8%D1%88%D0%BA%D0%B8%D0%BD_%D0%98.%D0%98..jpg',
};
