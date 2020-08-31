import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { inject, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { PlatformService } from '../tools/platform.service';
import { LazyDataProviderService } from './lazy-data-provider.service';
import { LocalizedLazyDataService } from './localized-lazy-data.service';
import { zhWorlds } from './sources/zh-worlds';
import { lazyFilesList } from './lazy-files-list';

const languages = ['en', 'fr', 'ja', 'de', 'ko', 'zh'] as const; // Not testing ru consistently, as it is not widely availabe (and we'd be testing that it falls back to en)

/**
 * Note about json imports in the following tests: we copy/paste the path each time (instead of using a helper),
 * because if the path name is not statically analyzable, it will not get included in the test bundle (and will produce false negatives).
 */
describe('LocalizedLazyDataService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule, TranslateModule.forRoot(), HttpClientModule],
      providers: [LazyDataProviderService, PlatformService, LocalizedLazyDataService],
    });
  });

  it('should be created', inject([LocalizedLazyDataService], (service: LocalizedLazyDataService) => {
    expect(service).toBeTruthy();
  }));

  it('should get i18n world name', inject([LocalizedLazyDataService], async (service: LocalizedLazyDataService) => {
    const n1 = 'Faerie';
    const w1 = service.getWorldName(n1);
    const r1 = await forkJoin(w1).toPromise();
    for (const l of languages) {
      expect(r1[l]).toBe(n1);
    }

    const n2 = 'BaiJinHuanXiang';
    const w2 = service.getWorldName(n2);
    const r2 = await forkJoin(w2).toPromise();
    for (const l of languages) {
      if (l === 'zh') expect(r2[l]).toBe(zhWorlds[n2]);
      else expect(r2[l]).toBe(n2);
    }
  }));

  it('should get i18n item', inject([LocalizedLazyDataService], async (service: LocalizedLazyDataService) => {
    const id = 1;
    const item = await forkJoin(service.getItem(id)).toPromise();
    const koItems = await import('../../../assets/data' + lazyFilesList['koItems'].fileName);
    const zhItems = await import('../../../assets/data' + lazyFilesList['zhItems'].fileName);
    const enItems = await import('../../../assets/data/' + lazyFilesList['items'].fileName);
    for (const l of languages) {
      switch (l) {
        case 'ko':
          expect(item[l]).toBe(koItems[id][l]);
          break;
        case 'zh':
          expect(item[l]).toBe(zhItems[id][l]);
          break;
        default:
          expect(item[l]).toBe(enItems[id][l]);
      }
    }
  }));

  it('should gracefully fallback to en when unavailabe', inject([LocalizedLazyDataService], async (service: LocalizedLazyDataService) => {
    const id = 1;
    const item = await forkJoin(service.getItem(id)).toPromise();
    const enItems = await import('../../../assets/data/' + lazyFilesList['items'].fileName);
    expect(item['ru']).not.toBeUndefined();
    expect(item['ru']).toBe(enItems[id]['en']);
  }));

  it('should get i18n fate', inject([LocalizedLazyDataService], async (service: LocalizedLazyDataService) => {
    const id = 120;
    const fate = await service.getFate(id).toPromise();
    const koFates = await import('../../../assets/data' + lazyFilesList['koFates'].fileName);
    const zhFates = await import('../../../assets/data' + lazyFilesList['zhFates'].fileName);
    const enFates = await import('../../../assets/data/' + lazyFilesList['fates'].fileName);
    expect(fate.icon).toBeTruthy();
    expect(fate.level).toBeTruthy();
    expect(fate.icon).toBe(enFates[id].icon);
    expect(fate.level).toBe(enFates[id].level);
    const name = await forkJoin(fate.name).toPromise();
    const desc = await forkJoin(fate.description).toPromise();
    for (const l of languages) {
      switch (l) {
        case 'ko':
          expect(name[l]).toBe(koFates[id].name[l]);
          expect(desc[l]).toBe(koFates[id].description[l]);
          break;
        case 'zh':
          expect(name[l]).toBe(zhFates[id].name[l]);
          expect(desc[l]).toBe(zhFates[id].description[l]);
          break;
        default:
          expect(name[l]).toBe(enFates[id].name[l]);
          expect(desc[l]).toBe(enFates[id].description[l]);
      }
    }
  }));

  it('should get i18n npc', inject([LocalizedLazyDataService], async (service: LocalizedLazyDataService) => {
    const id = 1000236;
    const npc = await service.getNpc(id).toPromise();
    const koNpc = await import('../../../assets/data' + lazyFilesList['koNpcs'].fileName);
    const zhNpc = await import('../../../assets/data' + lazyFilesList['zhNpcs'].fileName);
    const enNpc = await import('../../../assets/data/' + lazyFilesList['npcs'].fileName);
    expect(npc.defaultTalks).toBeTruthy();
    const name = await forkJoin({ en: npc.en, de: npc.de, fr: npc.fr, ja: npc.ja, ko: npc.ko, zh: npc.zh }).toPromise();
    console.log(name);
    for (const l of languages) {
      switch (l) {
        case 'ko':
          expect(name[l]).toBe(koNpc[id][l]);
          break;
        case 'zh':
          expect(name[l]).toBe(zhNpc[id][l]);
          break;
        default:
          expect(name[l]).toBe(enNpc[id][l]);
      }
    }
  }));
});
