/**
 * IP Address Extraction Utility
 * Handles proxy scenarios and extracts real client IP from headers
 */

/**
 * Extract IP address from request headers
 * Checks common proxy headers and falls back to direct connection
 *
 * @param headers - Request headers object
 * @returns IP address or 'unknown' if not found
 */
export function getIpAddress(headers: Headers): string {
  // Check Cloudflare header (most reliable if behind Cloudflare)
  const cfConnectingIp = headers.get('CF-Connecting-IP');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Check X-Real-IP (common in nginx proxy setups)
  const xRealIp = headers.get('X-Real-IP');
  if (xRealIp) {
    return xRealIp;
  }

  // Check X-Forwarded-For (standard proxy header, may contain multiple IPs)
  const xForwardedFor = headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    // X-Forwarded-For can be "client, proxy1, proxy2"
    // Take the first IP (original client)
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) {
      return firstIp;
    }
  }

  // Fallback for development/direct connections
  return 'unknown';
}
