import { describe, expect, it } from 'vitest';

import {
  extractNationalId,
  extractPersonName,
  extractSaudiPhone,
} from './personal';

const SAMPLE_DOCUMENT = `
KINGDOM OF SAUDI ARABIA
MINISTRY OF INTERIOR
National ID 1098765432
Mobile 966512345678
Freelancer License ELESL
`;

describe('extractNationalId', () => {
  it('extracts a 10-digit Saudi ID starting with 1 or 2', () => {
    expect(extractNationalId(SAMPLE_DOCUMENT)).toBe('1098765432');
  });

  it('extracts IDs that start with 2', () => {
    expect(extractNationalId('رقم 2123456789 صحيح')).toBe('2123456789');
  });

  it('rejects 10-digit numbers starting with other digits', () => {
    expect(extractNationalId('ref 3123456789')).toBeNull();
  });

  it('rejects short numbers', () => {
    expect(extractNationalId('id 123456789')).toBeNull();
  });
});

describe('extractSaudiPhone', () => {
  it('normalizes 9665… numbers to 05…', () => {
    expect(extractSaudiPhone('call 966512345678 now')).toBe('0512345678');
  });

  it('keeps 05… numbers as-is', () => {
    expect(extractSaudiPhone('0512345678')).toBe('0512345678');
  });

  it('ignores separators while matching', () => {
    expect(extractSaudiPhone('+966-51-234-5678')).toBe('0512345678');
  });

  it('returns null when no valid number exists', () => {
    expect(extractSaudiPhone('0512345')).toBeNull();
    expect(extractSaudiPhone('no phone here')).toBeNull();
  });
});

describe('extractPersonName', () => {
  it('extracts a standalone English name (uppercased)', () => {
    expect(extractPersonName('AHMED SALEH ALI')).toBe('AHMED SALEH ALI');
  });

  it('returns null when only document words match', () => {
    expect(extractPersonName('KINGDOM OF SAUDI ARABIA')).toBeNull();
  });

  it('excludes ministry/freelancer/elesl candidates', () => {
    expect(extractPersonName('Ministry of Environment freelancer ELESL 2023')).toBeNull();
  });

  it('picks the longest valid English candidate', () => {
    expect(extractPersonName('Ahmed Saleh, Khalid Saad Omar')).toBe('KHALID SAAD OMAR');
  });

  it('falls back to Arabic when no English name qualifies', () => {
    const name = extractPersonName('المملكة العربية السعودية خالد سعيد عبدالله النعيمي');
    expect(name).toBe('خالد سعيد عبدالله النعيمي');
  });

  it('requires at least 3 non-document Arabic words', () => {
    expect(extractPersonName('رقم التاريخ اصدار')).toBeNull();
    expect(extractPersonName('خالد سعيد عبدالله')).toBe('خالد سعيد عبدالله');
  });

  it('returns null when nothing qualifies', () => {
    expect(extractPersonName('12345')).toBeNull();
  });
});