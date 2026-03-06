import { describe, it, expect } from 'vitest';
import { getIpAddress } from '@/lib/auth/ip-address';

describe('getIpAddress()', () => {
  it('should extract IP from CF-Connecting-IP header', () => {
    const headers = new Headers();
    headers.set('CF-Connecting-IP', '203.0.113.1');
    headers.set('X-Real-IP', '198.51.100.1'); // Should be ignored
    headers.set('X-Forwarded-For', '192.0.2.1'); // Should be ignored

    const result = getIpAddress(headers);

    expect(result).toBe('203.0.113.1');
  });

  it('should extract IP from X-Real-IP when CF-Connecting-IP not present', () => {
    const headers = new Headers();
    headers.set('X-Real-IP', '198.51.100.1');
    headers.set('X-Forwarded-For', '192.0.2.1'); // Should be ignored

    const result = getIpAddress(headers);

    expect(result).toBe('198.51.100.1');
  });

  it('should extract first IP from X-Forwarded-For when others not present', () => {
    const headers = new Headers();
    headers.set('X-Forwarded-For', '192.0.2.1, 198.51.100.1, 203.0.113.1');

    const result = getIpAddress(headers);

    expect(result).toBe('192.0.2.1');
  });

  it('should handle single IP in X-Forwarded-For', () => {
    const headers = new Headers();
    headers.set('X-Forwarded-For', '192.0.2.1');

    const result = getIpAddress(headers);

    expect(result).toBe('192.0.2.1');
  });

  it('should trim whitespace from X-Forwarded-For IP', () => {
    const headers = new Headers();
    headers.set('X-Forwarded-For', '  192.0.2.1  , 198.51.100.1');

    const result = getIpAddress(headers);

    expect(result).toBe('192.0.2.1');
  });

  it('should return "unknown" when no IP headers present', () => {
    const headers = new Headers();

    const result = getIpAddress(headers);

    expect(result).toBe('unknown');
  });

  it('should return "unknown" when X-Forwarded-For is empty', () => {
    const headers = new Headers();
    headers.set('X-Forwarded-For', '');

    const result = getIpAddress(headers);

    expect(result).toBe('unknown');
  });

  it('should prioritize headers in correct order: CF > X-Real-IP > X-Forwarded-For', () => {
    // Test CF-Connecting-IP priority
    let headers = new Headers();
    headers.set('CF-Connecting-IP', '203.0.113.1');
    headers.set('X-Real-IP', '198.51.100.1');
    headers.set('X-Forwarded-For', '192.0.2.1');
    expect(getIpAddress(headers)).toBe('203.0.113.1');

    // Test X-Real-IP priority over X-Forwarded-For
    headers = new Headers();
    headers.set('X-Real-IP', '198.51.100.1');
    headers.set('X-Forwarded-For', '192.0.2.1');
    expect(getIpAddress(headers)).toBe('198.51.100.1');
  });

  it('should handle IPv6 addresses', () => {
    const headers = new Headers();
    headers.set('CF-Connecting-IP', '2001:0db8:85a3:0000:0000:8a2e:0370:7334');

    const result = getIpAddress(headers);

    expect(result).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
  });

  it('should handle localhost IP', () => {
    const headers = new Headers();
    headers.set('X-Real-IP', '127.0.0.1');

    const result = getIpAddress(headers);

    expect(result).toBe('127.0.0.1');
  });
});
