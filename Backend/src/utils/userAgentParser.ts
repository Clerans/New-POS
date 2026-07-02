export interface ClientMetadata {
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
}

export function parseUserAgent(userAgent: string | undefined): { device: string; browser: string; os: string } {
  if (!userAgent) {
    return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
  }

  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let device = 'Desktop';

  const ua = userAgent.toLowerCase();

  // Browser detection
  if (ua.includes('opr/') || ua.includes('opera')) {
    browser = 'Opera';
  } else if (ua.includes('edg/')) {
    browser = 'Edge';
  } else if (ua.includes('firefox/')) {
    browser = 'Firefox';
  } else if (ua.includes('chrome/')) {
    browser = 'Chrome';
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browser = 'Safari';
  } else if (ua.includes('msie') || ua.includes('trident/')) {
    browser = 'Internet Explorer';
  }

  // OS detection
  if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('macintosh') || ua.includes('mac os x')) {
    os = 'macOS';
  } else if (ua.includes('linux') && !ua.includes('android')) {
    os = 'Linux';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = 'iOS';
    device = ua.includes('ipad') ? 'Tablet' : 'Mobile';
  } else if (ua.includes('android')) {
    os = 'Android';
    device = 'Mobile';
  }

  // Simple Device detection fallback
  if (ua.includes('mobile') || ua.includes('tablet') || ua.includes('mobi')) {
    if (device === 'Desktop') {
      device = ua.includes('tablet') ? 'Tablet' : 'Mobile';
    }
  }

  return { device, browser, os };
}
