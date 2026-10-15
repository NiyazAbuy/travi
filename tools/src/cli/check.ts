import { checkContent } from '../check';
import { ContentValidationError } from '../errors';
import { CONTENT_DIR } from '../paths';

const { content, errors } = await checkContent(CONTENT_DIR);
if (errors.length > 0) {
  console.error(new ContentValidationError(errors).message);
  process.exit(1);
}
console.log(
  `Ошибок нет. Трав: ${content.herbs.length}, сборов: ${content.recipes.length}, источников: ${content.sources.length}`,
);
