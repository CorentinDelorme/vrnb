import { describe, expect, it } from 'vitest';

import type { IdentityField } from './validation';
import {
  checkIdentityField,
  checkIdentityFields,
  IDENTITY_FIELD_LABELS,
  IDENTITY_FIELD_MAX_LENGTH,
  IDENTITY_FIELD_MIN_LENGTH,
  IDENTITY_FIELDS,
  isRegistrationRejection,
  isValidIdentityField,
} from './validation';

/**
 * The shared registration contract (ticket #18): the identity bounds enforced
 * by BOTH the client (the modal never sends what the server would reject)
 * and the server (the POST handler), the French labels of the four fields and
 * the rejection codes of a 400 answer.
 */

describe('checkIdentityField', () => {
  it('should trim the value and accept it within the bounds', () => {
    expect(checkIdentityField('  Léa  ')).toEqual({ error: null, value: 'Léa' });
    expect(checkIdentityField('Lé')).toEqual({ error: null, value: 'Lé' });
    expect(checkIdentityField('b'.repeat(60))).toEqual({ error: null, value: 'b'.repeat(60) });
  });

  it('should refuse a blank value as required', () => {
    expect(checkIdentityField('')).toEqual({ error: 'required', value: '' });
    expect(checkIdentityField('   ')).toEqual({ error: 'required', value: '' });
    expect(checkIdentityField('\t\n')).toEqual({ error: 'required', value: '' });
  });

  it('should refuse a too short value', () => {
    expect(checkIdentityField('L')).toEqual({ error: 'too-short', value: 'L' });
    expect(checkIdentityField(' L ')).toEqual({ error: 'too-short', value: 'L' });
  });

  it('should refuse a too long value', () => {
    const tooLong = 'c'.repeat(61);
    expect(checkIdentityField(tooLong)).toEqual({ error: 'too-long', value: tooLong });
  });

  it('should count the trimmed value, not the raw one', () => {
    // 60 characters plus spaces: the trimmed value is within the bounds.
    expect(isValidIdentityField(`  ${'d'.repeat(60)}  `)).toBe(true);
    // 61 characters plus spaces: the trimmed value is over the bound.
    expect(isValidIdentityField(`  ${'d'.repeat(61)}  `)).toBe(false);
  });
});

describe('checkIdentityFields', () => {
  it('should keep the trimmed values and report the offending fields only', () => {
    const check = checkIdentityFields({
      firstName1: ' Léa ',
      firstName2: 'M',
      lastName1: 'Dupont',
      lastName2: '  ',
    });

    expect(check.values).toEqual({
      firstName1: 'Léa',
      firstName2: 'M',
      lastName1: 'Dupont',
      lastName2: '',
    });
    expect(check.errors).toEqual({ firstName2: 'too-short', lastName2: 'required' });
  });

  it('should report no error on a complete form', () => {
    const check = checkIdentityFields({
      firstName1: 'Léa',
      firstName2: 'Marc',
      lastName1: 'Dupont',
      lastName2: 'Martin',
    });

    expect(check.errors).toEqual({});
  });
});

describe('the shared bounds and labels', () => {
  it('should bound every identity field between 2 and 60 characters', () => {
    expect(IDENTITY_FIELD_MIN_LENGTH).toBe(2);
    expect(IDENTITY_FIELD_MAX_LENGTH).toBe(60);
    expect(IDENTITY_FIELDS).toEqual(['firstName1', 'lastName1', 'firstName2', 'lastName2']);
  });

  it('should label the four identity fields in French', () => {
    expect(IDENTITY_FIELD_LABELS).toEqual({
      firstName1: 'Prénom du membre 1',
      firstName2: 'Prénom du membre 2',
      lastName1: 'Nom du membre 1',
      lastName2: 'Nom du membre 2',
    });
  });
});

describe('isRegistrationRejection', () => {
  it('should recognize the rejection codes of a 400 answer', () => {
    for (const code of ['invalid-inscription', 'registration-closed', 'registration-not-open']) {
      expect(isRegistrationRejection(code)).toBe(true);
    }
    // The anti-bot honeypot has no dedicated code: it is refused like any
    // other invalid input, so a bot cannot fingerprint the trap.
    expect(isRegistrationRejection('honeypot-triggered')).toBe(false);
    expect(isRegistrationRejection('inscriptions-conflict')).toBe(false);
    expect(isRegistrationRejection('')).toBe(false);
  });
});

describe('the identity field keys', () => {
  it('should be the four keys of the registration body', () => {
    const keys: readonly IdentityField[] = IDENTITY_FIELDS;
    expect(keys).toHaveLength(4);
  });
});
