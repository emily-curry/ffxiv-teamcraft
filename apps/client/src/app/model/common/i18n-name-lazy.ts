import { Observable } from 'rxjs';
import { I18nName } from './i18n-name';

export type I18nNameLazy = I18nLazy<I18nName>;

/**
 * A utility type that deep maps all properties of an object assignable to `I18nName`
 * into a lazy-loadable version.
 */
export type I18nLazy<T extends {}> = { [K in Extract<keyof T, keyof I18nName>]-?: Observable<string | undefined> } &
  { [K in keyof T]: K extends keyof I18nName ? unknown : T[K] extends Record<any, any> ? I18nLazy<T[K]> : T[K] };
