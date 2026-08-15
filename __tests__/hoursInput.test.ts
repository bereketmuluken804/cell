/**
 * @format
 */

import { maskHours, maskOnChange } from '../src/hoursInput';

describe('maskHours', () => {
  test('empty input stays empty', () => {
    expect(maskHours('')).toBe('');
  });

  test('one or two digits stay as plain hours', () => {
    expect(maskHours('0')).toBe('0');
    expect(maskHours('1')).toBe('1');
    expect(maskHours('8')).toBe('8');
    expect(maskHours('12')).toBe('12');
    expect(maskHours('23')).toBe('23');
    expect(maskHours('24')).toBe('24');
  });

  test('leading zeros are collapsed in plain hours', () => {
    expect(maskHours('00')).toBe('0');
    expect(maskHours('07')).toBe('7');
  });

  test('three digits split at H:MM', () => {
    expect(maskHours('230')).toBe('2:30');
    expect(maskHours('830')).toBe('8:30');
    expect(maskHours('120')).toBe('1:20');
    expect(maskHours('003')).toBe('0:03');
  });

  test('four digits split at HH:MM', () => {
    expect(maskHours('1200')).toBe('12:00');
    expect(maskHours('1234')).toBe('12:34');
    expect(maskHours('2400')).toBe('24:00');
    expect(maskHours('2459')).toBe('24:59');
    expect(maskHours('0032')).toBe('0:32');
    expect(maskHours('0000')).toBe('0:00');
  });

  test('hours clamp to 24 and minutes to 59', () => {
    expect(maskHours('2599')).toBe('24:59');
    expect(maskHours('1299')).toBe('12:59');
    expect(maskHours('9999')).toBe('24:59');
  });

  test('at most four digits are kept', () => {
    expect(maskHours('12345')).toBe('12:34');
    expect(maskHours('12005')).toBe('12:00');
  });

  test('non-digit text produces empty string', () => {
    expect(maskHours('abc')).toBe('');
    expect(maskHours('-:.,')).toBe('');
  });

  test('already-formatted values are idempotent', () => {
    expect(maskHours('12:00')).toBe('12:00');
    expect(maskHours('2:30')).toBe('2:30');
    expect(maskHours('7:00')).toBe('7:00');
    expect(maskHours('0:32')).toBe('0:32');
  });

  test('the 4th digit moves the colon into the correct place', () => {
    // Typing "1200" lands here because the mask inserts ":" after 3 digits.
    expect(maskHours('1:200')).toBe('12:00');
    expect(maskHours('8:300')).toBe('24:00');
    expect(maskHours('0:032')).toBe('0:32');
  });
});

describe('maskOnChange', () => {
  test('masks plain digit input', () => {
    const set = jest.fn();
    const handler = maskOnChange(set);
    handler('1');
    handler('12');
    handler('120');
    expect(set.mock.calls.map(c => c[0])).toEqual(['1', '12', '1:20']);
  });

  test('masks text that already contains the inserted colon', () => {
    const set = jest.fn();
    const handler = maskOnChange(set);
    handler('1:200');
    handler('1200');
    expect(set.mock.calls.map(c => c[0])).toEqual(['12:00', '12:00']);
  });

  test('passes decimal entry through untouched', () => {
    const set = jest.fn();
    const handler = maskOnChange(set);
    handler('2.');
    handler('2.5');
    handler('2.50');
    expect(set.mock.calls.map(c => c[0])).toEqual(['2.', '2.5', '2.50']);
  });

  test('normalizes a pasted value to itself', () => {
    const set = jest.fn();
    maskOnChange(set)('12:30');
    expect(set).toHaveBeenCalledWith('12:30');
  });
});
