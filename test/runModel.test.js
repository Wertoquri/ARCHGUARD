import { describe, it, expect } from 'vitest';
import { safeParseJson } from '../src/models/runModel.js';

describe('safeParseJson', () => {
  it('parses JSON string arrays', () => {
    const v = '[1,2,3]';
    expect(safeParseJson(v, [])).toEqual([1, 2, 3]);
  });

  it('parses JSON string objects', () => {
    const v = '{"a":1}';
    expect(safeParseJson(v, {})).toEqual({ a: 1 });
  });

  it('returns fallback for null/undefined', () => {
    expect(safeParseJson(null, [])).toEqual([]);
    expect(safeParseJson(undefined, {})).toEqual({});
  });

  it('returns value if already parsed', () => {
    const arr = ["x"];
    expect(safeParseJson(arr, [])).toBe(arr);
    const obj = { b: 2 };
    expect(safeParseJson(obj, {})).toBe(obj);
  });

  it('returns fallback for invalid json strings', () => {
    expect(safeParseJson('', [])).toEqual([]);
    expect(safeParseJson('not-json', {})).toEqual({});
  });
});
