import { formatBytes, greetingKey } from '../format';

describe('format helpers', () => {
  it('formats byte sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB');
  });

  it('greets by time of day', () => {
    expect(greetingKey(new Date(2026, 0, 1, 8))).toBe('today.morning');
    expect(greetingKey(new Date(2026, 0, 1, 14))).toBe('today.afternoon');
    expect(greetingKey(new Date(2026, 0, 1, 21))).toBe('today.evening');
  });
});
