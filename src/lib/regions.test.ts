import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REGIONS, isRegionCode, regionByCode, regionByName } from './regions';

describe('canonical regions', () => {
  it('lists the 13 Saudi regions with unique codes and names', () => {
    expect(REGIONS).toHaveLength(13);
    expect(new Set(REGIONS.map((region) => region.code)).size).toBe(13);
    expect(new Set(REGIONS.map((region) => region.nameAr)).size).toBe(13);
  });

  it('matches the rows seeded by migration 0006 (code, name and order)', () => {
    const sql = readFileSync(resolve(__dirname, '../../drizzle/0006_marketplace_offers_contracts.sql'), 'utf8');
    const seeded = [...sql.matchAll(/\('([a-z_]+)', '([^']+)', (\d+)\)/g)].map(([, code, nameAr, order]) => ({
      code,
      nameAr,
      order: Number(order),
    }));
    expect(seeded).toEqual(REGIONS.map((region, index) => ({ code: region.code, nameAr: region.nameAr, order: index + 1 })));
  });

  it('resolves codes for URLs and rejects unknown values', () => {
    expect(regionByCode('riyadh')?.nameAr).toBe('منطقة الرياض');
    expect(regionByName('المنطقة الشرقية')?.code).toBe('eastern');
    expect(regionByCode('atlantis')).toBeNull();
    expect(isRegionCode('<script>')).toBe(false);
  });
});
