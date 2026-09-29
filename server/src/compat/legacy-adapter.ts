export interface LegacyTermItem {
  id?: string;
  kw: string;
  zh_cn?: string;
  sourceText?: string;
  context?: string;
  owner_component?: string;
  max_chars?: number;
  is_locked?: boolean | number;
  sort_order?: number;
  translations?: Record<string, string> | string;
  translations_meta?: Record<string, string> | string;
}

export interface LegacySyncPayload {
  added?: LegacyTermItem[];
  updated?: LegacyTermItem[];
  deletedIds?: string[];
}

export function adaptLegacyTermToV2(legacyItem: LegacyTermItem, versionId: string) {
  let translationsObj: Record<string, string> = {};
  if (typeof legacyItem.translations === 'string') {
    try {
      translationsObj = JSON.parse(legacyItem.translations);
    } catch {
      translationsObj = {};
    }
  } else if (legacyItem.translations && typeof legacyItem.translations === 'object') {
    translationsObj = legacyItem.translations;
  }

  return {
    id: legacyItem.id,
    versionId,
    kw: legacyItem.kw,
    zhCn: legacyItem.zh_cn || legacyItem.sourceText || '',
    context: legacyItem.context || '',
    ownerComponent: legacyItem.owner_component || '',
    maxChars: Number(legacyItem.max_chars || 0),
    isLocked: Boolean(legacyItem.is_locked),
    sortOrder: Number(legacyItem.sort_order || 0),
    translations: translationsObj,
  };
}

export function adaptV2TermToLegacy(v2Term: any): LegacyTermItem {
  return {
    id: v2Term.id,
    kw: v2Term.kw,
    zh_cn: v2Term.zhCn,
    sourceText: v2Term.zhCn,
    context: v2Term.context,
    owner_component: v2Term.ownerComponent,
    max_chars: v2Term.maxChars,
    is_locked: v2Term.isLocked,
    sort_order: v2Term.sortOrder,
    translations: v2Term.translations || {},
    translations_meta: v2Term.translationsMeta || {},
  };
}
