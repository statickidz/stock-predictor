import {assetUrl} from './asset-url.js';

export const SEO = Object.freeze({
  name: 'Stock Predictor',
  title: 'AI Stock Prediction & Forecasts | Stock Predictor',
  description: 'Explore AI stock prediction, ETF and crypto forecasts powered by Kronos. Run models on your device using daily market snapshots. For research only.',
  image: 'social-preview.png',
  imageAlt: 'AI stock prediction with Stock Predictor — stock, ETF and crypto forecasts powered by Kronos, running on your device.',
  imageWidth: 1200,
  imageHeight: 630,
});

// Use the build's public origin, never the localhost URL used while prerendering.
export function getSeoUrls(site, base = '/') {
  return {
    canonical: site ? new URL(assetUrl('', base), site).href : undefined,
    image: site ? new URL(assetUrl(SEO.image, base), site).href : assetUrl(SEO.image, base),
    sitemap: site ? new URL(assetUrl('sitemap.xml', base), site).href : undefined,
  };
}

export function robotsTxt(site, base = '/') {
  const {sitemap} = getSeoUrls(site, base);
  return `User-agent: *\nAllow: /\n${sitemap ? `\nSitemap: ${sitemap}\n` : ''}`;
}

export function sitemapXml(site, base = '/') {
  const {canonical} = getSeoUrls(site, base);
  const location = canonical?.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${location ? `\n  <url><loc>${location}</loc></url>\n` : ''}</urlset>\n`;
}
