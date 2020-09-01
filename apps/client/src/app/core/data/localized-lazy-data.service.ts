import { Injectable } from '@angular/core';
import { get } from 'lodash';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { I18nLazy, I18nNameLazy } from '../../model/common/i18n-name-lazy';
import { Fate } from '../../pages/db/model/fate/fate';
import { Npc } from '../../pages/db/model/npc/npc';
import { Quest } from '../../pages/db/model/quest/quest';
import { Trait } from '../../pages/db/model/trait/trait';
import { ExtendedLanguageKeys } from './extended-language-keys';
import { Language } from './language';
import { LazyDataKey } from './lazy-data';
import { LazyDataProviderService } from './lazy-data-provider.service';
import { lazyFilesList } from './lazy-files-list';
import { mapIds } from './sources/map-ids';
import { zhWorlds } from './sources/zh-worlds';

@Injectable({ providedIn: 'root' })
export class LocalizedLazyDataService {
  private readonly dataKeys = new Set(Object.keys(lazyFilesList));
  private readonly indentRegexp = new RegExp('<Indent/>', 'i');

  constructor(private lazyDataProvider: LazyDataProviderService) {}

  private getResolver(key: LazyDataKey, accessor: number | string, lang: Language): Observable<string | undefined> {
    return this.lazyDataProvider.getLazyData(key).pipe(
      map((data) => {
        if (!get(data, accessor)) return undefined;
        const baseValue = get(data, `${accessor}.${lang}`, undefined);
        if (lang === 'fr') return baseValue?.replace(this.indentRegexp, '');
        return baseValue;
      })
    );
  }

  private getFallbackResolver(
    extKey: LazyDataKey | undefined,
    fallbackKey: LazyDataKey,
    accessor: number | string,
    lang: Language
  ): Observable<string | undefined> {
    const fallbackResolver = this.getResolver(fallbackKey, accessor, lang).pipe(
      switchMap((val) => (val ? of(val) : this.getResolver(fallbackKey, accessor, 'en')))
    );
    if (extKey) {
      return this.getResolver(extKey, accessor, lang).pipe(switchMap((val) => (val ? of(val) : fallbackResolver)));
    } else {
      return fallbackResolver;
    }
  }

  private getRow(key: LazyDataKey, accessor: number | string): I18nNameLazy {
    const { koKey, ruKey, zhKey } = this.guessExtendedLanguageKeys(key);

    return {
      de: this.getResolver(key, accessor, 'de'),
      en: this.getResolver(key, accessor, 'en'),
      fr: this.getResolver(key, accessor, 'fr'),
      ja: this.getResolver(key, accessor, 'ja'),
      ko: this.getFallbackResolver(koKey, key, accessor, 'ko'),
      ru: this.getFallbackResolver(ruKey, key, accessor, 'ru'),
      zh: this.getFallbackResolver(zhKey, key, accessor, 'zh'),
    };
  }

  private guessExtendedLanguageKeys(key: LazyDataKey): ExtendedLanguageKeys {
    return {
      zhKey: this.guessExtendedLanguageKey('zh', key),
      koKey: this.guessExtendedLanguageKey('ko', key),
      ruKey: this.guessExtendedLanguageKey('ru', key),
    };
  }

  private guessExtendedLanguageKey(language: string, key: string): LazyDataKey | undefined {
    const guessKey = `${language}${key.charAt(0).toUpperCase()}${key.substr(1)}`;
    if (this.isLazyDataKey(guessKey)) {
      return guessKey;
    }

    return undefined;
  }

  public getWorldName(world: string): I18nNameLazy {
    const i18nName: I18nNameLazy = {
      fr: of(world),
      en: of(world),
      de: of(world),
      ja: of(world),
      zh: of(zhWorlds[world] ?? world),
      ko: of(world),
      ru: of(world),
    };

    return i18nName;
  }

  public getItem(id: number): I18nNameLazy {
    return this.getRow('items', id);
  }

  public getInstanceName(id: number): I18nNameLazy {
    return this.getRow('instances', id);
  }

  public getAchievementName(id: number): I18nNameLazy {
    return this.getRow('achievements', id);
  }

  public getMapByName(name: string): I18nNameLazy {
    const id = this.getMapId(name);
    return this.getMapName(id);
  }

  public getMapName(id: number): I18nNameLazy {
    const entry = mapIds.find((m) => m.id === id);
    return this.getPlace(entry ? entry.zone : 1);
  }

  public getPlace(id: number): I18nNameLazy {
    return this.getRow('places', id);
  }

  public getFate(id: number): Observable<I18nLazy<Fate>> {
    return this.lazyDataProvider.getLazyData('fates').pipe(
      map((fates) => {
        return { ...fates[id], name: this.getRow('fates', `${id}.name`), description: this.getRow('fates', `${id}.description`) };
      })
    );
  }

  public getNpc(id: number): Observable<I18nLazy<Npc>> {
    const { koKey, ruKey, zhKey } = this.guessExtendedLanguageKeys('npcs');
    return this.lazyDataProvider.getLazyData('npcs').pipe(
      map((all) => {
        const npc = all[id];
        return {
          ...npc,
          en: of(npc?.en),
          de: of(npc?.de),
          ja: of(npc?.ja),
          fr: of(npc?.fr),
          ko: this.getFallbackResolver(koKey, 'npcs', id, 'ko'),
          ru: this.getFallbackResolver(ruKey, 'npcs', id, 'ru'),
          zh: this.getFallbackResolver(zhKey, 'npcs', id, 'zh'),
        };
      })
    );
  }

  public getNpcName(id: number): I18nNameLazy {
    return this.getRow('npcs', id);
  }

  public getLeve(id: number): I18nNameLazy {
    return this.getRow('leves', id);
  }

  public getShopName(englishName: string): I18nNameLazy {
    const { koKey, ruKey, zhKey } = this.guessExtendedLanguageKeys('shops');
    const resolver = (lang: Language, extKey?: LazyDataKey) =>
      this.lazyDataProvider.getLazyData('shops').pipe(
        switchMap((shops) => {
          const id = +Object.keys(shops).find((k) => shops[k].en === englishName);
          return this.getFallbackResolver(extKey, 'shops', id, lang);
        })
      );
    return {
      en: resolver('en'),
      de: resolver('de'),
      ja: resolver('ja'),
      fr: resolver('fr'),
      ko: resolver('ko', koKey),
      ru: resolver('ru', ruKey),
      zh: resolver('zh', zhKey),
    };
  }

  public getJobName(id: number): I18nNameLazy {
    return this.getRow('jobName', id);
  }

  public getJobAbbr(id: number): I18nNameLazy {
    return this.getRow('jobAbbr', id);
  }

  public getMob(id: number): I18nNameLazy {
    return this.getRow('mobs', id);
  }

  public getMobId(name: string): Observable<number | undefined> {
    return this.lazyDataProvider.getLazyData('mobs').pipe(map((mobs) => +Object.keys(mobs).find((k) => mobs[k]?.en?.toLowerCase() === name.toLowerCase())));
  }

  public getVenture(id: number): I18nNameLazy {
    return this.getRow('ventures', id);
  }

  public getQuest(id: number): Observable<I18nLazy<Quest>> {
    const { ruKey, koKey, zhKey } = this.guessExtendedLanguageKeys('quests');
    return this.lazyDataProvider.getLazyData('quests').pipe(
      map((quests) => {
        const quest = quests[id];
        const en = of(quest?.name?.en);
        return {
          ...quest,
          name: {
            en,
            de: of(quest?.name?.de),
            ja: of(quest?.name?.ja),
            fr: of(quest?.name?.fr),
            ko: koKey ? this.getResolver(koKey, id, 'ko').pipe(switchMap((res) => (res ? of(res) : en))) : en,
            ru: ruKey ? this.getResolver(ruKey, id, 'ru').pipe(switchMap((res) => (res ? of(res) : en))) : en,
            zh: zhKey ? this.getResolver(zhKey, id, 'zh').pipe(switchMap((res) => (res ? of(res) : en))) : en,
          },
        };
      })
    );
  }

  public getTrait(id: number): Observable<I18nLazy<Trait>> {
    const traitsExt = this.guessExtendedLanguageKeys('traits');
    const traitsDescExt = this.guessExtendedLanguageKeys('traitDescriptions' as LazyDataKey);
    return this.lazyDataProvider.getLazyData('traits').pipe(
      map((all) => {
        const trait = all[id];
        const enDesc = of(trait?.description?.en);
        return {
          ...trait,
          en: of(trait?.en),
          de: of(trait?.de),
          ja: of(trait?.ja),
          fr: of(trait?.fr),
          ko: this.getFallbackResolver(traitsExt.koKey, 'traits', id, 'ko'),
          ru: this.getFallbackResolver(traitsExt.ruKey, 'traits', id, 'ru'),
          zh: this.getFallbackResolver(traitsExt.zhKey, 'traits', id, 'zh'),
          description: {
            en: enDesc,
            de: of(trait?.description?.de),
            ja: of(trait?.description?.ja),
            fr: of(trait?.description?.fr),
            ko: traitsDescExt.koKey ? this.getResolver(traitsDescExt.koKey, id, 'ko').pipe(switchMap((val) => (val ? of(val) : enDesc))) : enDesc,
            ru: traitsDescExt.ruKey ? this.getResolver(traitsDescExt.ruKey, id, 'ru').pipe(switchMap((val) => (val ? of(val) : enDesc))) : enDesc,
            zh: traitsDescExt.zhKey ? this.getResolver(traitsDescExt.zhKey, id, 'zh').pipe(switchMap((val) => (val ? of(val) : enDesc))) : enDesc,
          },
        };
      })
    );
  }

  public getRaceName(id: number): I18nNameLazy {
    return this.getRow('races', id);
  }

  public getTribeName(id: number): I18nNameLazy {
    const data = this.lazyDataProvider.getLazyData('tribes').pipe(map((p) => p[id]));
    const { ruKey, koKey, zhKey } = this.guessExtendedLanguageKeys('tribes');
    const en = data.pipe(map((d) => d['Name_en']));
    return {
      en,
      de: data.pipe(map((d) => d['Name_de'])),
      ja: data.pipe(map((d) => d['Name_ja'])),
      fr: data.pipe(map((d) => d['Name_fr'])),
      ko: !koKey ? en : this.lazyDataProvider.getLazyData(koKey).pipe(switchMap((p) => (p?.[id]?.['ko'] ? of(p?.[id]?.['ko']) : en))),
      ru: !ruKey ? en : this.lazyDataProvider.getLazyData(ruKey).pipe(switchMap((p) => (p?.[id]?.['ru'] ? of(p?.[id]?.['ru']) : en))),
      zh: !zhKey ? en : this.lazyDataProvider.getLazyData(zhKey).pipe(switchMap((p) => (p?.[id]?.['zh'] ? of(p?.[id]?.['zh']) : en))),
    };
  }

  public getTTRule(id: number): I18nNameLazy {
    return this.getRow('tripleTriadRules', id);
  }

  public getBaseParamName(id: number): I18nNameLazy {
    const data = this.lazyDataProvider.getLazyData('baseParams').pipe(map((p) => p[id]));
    const { ruKey, koKey, zhKey } = this.guessExtendedLanguageKeys('baseParams');
    const en = data.pipe(map((d) => d['Name_en']));
    return {
      en,
      de: data.pipe(map((d) => d['Name_de'])),
      ja: data.pipe(map((d) => d['Name_ja'])),
      fr: data.pipe(map((d) => d['Name_fr'])),
      ko: !koKey ? en : this.lazyDataProvider.getLazyData(koKey).pipe(switchMap((p) => (p?.[id]?.['ko'] ? of(p?.[id]?.['ko']) : en))),
      ru: !ruKey ? en : this.lazyDataProvider.getLazyData(ruKey).pipe(switchMap((p) => (p?.[id]?.['ru'] ? of(p?.[id]?.['ru']) : en))),
      zh: !zhKey ? en : this.lazyDataProvider.getLazyData(zhKey).pipe(switchMap((p) => (p?.[id]?.['zh'] ? of(p?.[id]?.['zh']) : en))),
    };
  }

  public getWeather(id: number): I18nNameLazy {
    return this.getRow('weathers', `${id}.name`);
  }

  public getWeatherId(name: string): Observable<number> {
    return this.lazyDataProvider.getLazyData('weathers').pipe(map(this.getIndexByName(name, 'en')));
  }

  public getAreaIdByENName(name: string): Observable<number> {
    return this.lazyDataProvider.getLazyData('places').pipe(map(this.getIndexByName(name, 'en')));
  }

  public getFreeCompanyAction(id: number): I18nNameLazy {
    return this.getRow('freeCompanyActions', id);
  }

  private getMapId(name: string): number {
    const result = mapIds.find((m) => m.name === name);
    if (result === undefined) {
      if (name === 'Gridania') {
        return 2;
      }
      if (name.startsWith('Eulmore - ')) {
        return 498;
      }
      // Diadem
      if (name === 'The Diadem') {
        return 538;
      }
      return -1;
    }
    return result.id;
  }

  /**
   * Gets the id of a row by name.
   * @param  array
   * @param {string} name
   * @param language
   * @param flip
   * @returns {number}
   */
  private readonly getIndexByName = (name: string, language: string, flip = false) => (array: any[]): number => {
    if (array === undefined) {
      return -1;
    }
    if (['en', 'fr', 'de', 'ja', 'ko', 'zh'].indexOf(language) === -1) {
      language = 'en';
    }
    let res = -1;
    let keys = Object.keys(array);
    if (flip) {
      keys = keys.reverse();
    }
    for (const key of keys) {
      if (!array[key]) {
        continue;
      }
      if (array[key].name && array[key].name[language].toString().toLowerCase() === name.toLowerCase()) {
        res = +key;
        break;
      }
      if (array[key][language] && array[key][language].toString().toLowerCase() === name.toLowerCase()) {
        res = +key;
        break;
      }
    }
    if (['ko', 'zh'].indexOf(language) > -1 && res === -1) {
      return this.getIndexByName(name, 'en')(array);
    }
    return res;
  };

  private isLazyDataKey(key: string): key is LazyDataKey {
    return this.dataKeys.has(key);
  }
}
