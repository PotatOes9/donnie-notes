import type {NotionClient} from './notion-core.ts';
import {textOf} from './notion-core.ts';
import {defaultCopy,mergeCopy} from './site-copy.ts';
import {mergeSettings,type SettingRow} from './site-settings.ts';
import {settingRow} from './site-asset-reader.ts';
import {mergeTranslations,type LocalizedCopyRow} from './site-translations.ts';

export async function readSiteCopy(client: NotionClient, sourceId: string) {
  const rows: LocalizedCopyRow[] = [];
  const settingsRows:SettingRow[]=[];
  const cursors = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const data = await client.call(`data_sources/${sourceId}/query`, 'POST', {
      page_size:100, ...(cursor ? {start_cursor:cursor} : {}),
    });
    for (const row of data.results || []) {
      if (row.archived || row.in_trash || row.is_archived) continue;
      const parent = row.parent || {};
      if (parent.type !== 'data_source_id' || parent.data_source_id?.replaceAll('-','') !== sourceId.replaceAll('-','')) continue;
      // Accept both labels while the existing Notion properties are renamed in place.
      const key = textOf((row.properties?.['识别码'] ?? row.properties?.['識別碼'])?.rich_text);
      const field = row.properties?.['显示文字'] ?? row.properties?.['顯示文字'];
      if (field?.type === 'rich_text') {
        const value=textOf(field.rich_text);
        rows.push({key,value,ja:textOf(row.properties?.['日文']?.rich_text),en:textOf(row.properties?.['英文']?.rich_text)});
        settingsRows.push(settingRow(row));
      }
    }
    if (!data.has_more) {
      const count = rows.filter(row => Object.hasOwn(defaultCopy,row.key)).length;
      if (!count) throw new Error('Website text database is empty or has an incompatible schema');
      const merged=mergeSettings(settingsRows);
      return {copy:mergeCopy(rows),localeCopies:{ja:mergeTranslations(rows,'ja'),en:mergeTranslations(rows,'en')},count,settings:merged.settings,assetSources:merged.sources,settingsCount:merged.count};
    }
    cursor = data.next_cursor;
    if (!cursor || cursors.has(cursor)) throw new Error('Website text pagination is incomplete');
    cursors.add(cursor);
  }
  throw new Error('Website text database exceeds the supported size');
}
