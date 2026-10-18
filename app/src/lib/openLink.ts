import { Alert, Linking } from 'react-native';

/** Открывает ссылку во внешнем приложении; при неудаче сообщает об этом (спецификация §10). */
export function openLink(url: string): void {
  Linking.openURL(url).catch(() => Alert.alert('Не удалось открыть ссылку'));
}
