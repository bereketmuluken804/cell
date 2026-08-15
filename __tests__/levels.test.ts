/**
 * @format
 */

import {
  DEFAULT_GOAL_HOURS,
  MIN_GOAL_HOURS,
  levelForHours,
} from '../src/levels';

describe('levelForHours', () => {
  test('zero hours is always empty', () => {
    expect(levelForHours(0, 8)).toBe(0);
    expect(levelForHours(-1, 8)).toBe(0);
    expect(levelForHours(0, 0.5)).toBe(0);
  });

  test('default goal is 8h', () => {
    expect(DEFAULT_GOAL_HOURS).toBe(8);
    const step = DEFAULT_GOAL_HOURS / 7;
    expect(levelForHours(step)).toBe(1);
    expect(levelForHours(DEFAULT_GOAL_HOURS)).toBe(6);
  });

  test('goal 8h splits 0-8 into 7 equal bands', () => {
    const step = 8 / 7;
    for (let lv = 1; lv <= 6; lv++) {
      const atLower = step * (lv - 1) + 0.001;
      expect(levelForHours(atLower, 8)).toBe(lv);
    }
    expect(levelForHours(8, 8)).toBe(6);
  });

  test('goal 2h', () => {
    expect(levelForHours(0.1, 2)).toBe(1);
    expect(levelForHours(0.58, 2)).toBe(3);
    expect(levelForHours(2, 2)).toBe(6);
    expect(levelForHours(4, 2)).toBe(6);
  });

  test('goal 0.5h (minimum)', () => {
    expect(MIN_GOAL_HOURS).toBe(0.5);
    expect(levelForHours(0.1, 0.5)).toBe(2);
    expect(levelForHours(0.5, 0.5)).toBe(6);
  });

  test('goal 12h', () => {
    const step = 12 / 7;
    expect(levelForHours(step, 12)).toBe(1);
    expect(levelForHours(step * 3, 12)).toBe(3);
    expect(levelForHours(12, 12)).toBe(6);
  });

  test('goal below minimum is clamped', () => {
    expect(levelForHours(0.5, 0.1)).toBe(6);
  });
});
