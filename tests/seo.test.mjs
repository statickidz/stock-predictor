import test from 'node:test';
import assert from 'node:assert/strict';

import {getSeoUrls, robotsTxt, sitemapXml} from '../src/lib/seo.js';

test('SEO links use the configured production origin on a root deployment', () => {
  assert.deepEqual(getSeoUrls(new URL('https://markets.example/')), {
    canonical: 'https://markets.example/',
    image: 'https://markets.example/social-preview.png',
    sitemap: 'https://markets.example/sitemap.xml',
  });
});

test('SEO links retain repository and nested deployment prefixes', () => {
  for (const base of ['/research/stock-predictor', '/research/stock-predictor/']) {
    assert.deepEqual(getSeoUrls(new URL('https://example.github.io/'), base), {
      canonical: 'https://example.github.io/research/stock-predictor/',
      image: 'https://example.github.io/research/stock-predictor/social-preview.png',
      sitemap: 'https://example.github.io/research/stock-predictor/sitemap.xml',
    });
  }
});

test('unconfigured local builds keep the image usable without inventing canonical URLs', () => {
  assert.deepEqual(getSeoUrls(undefined, '/stock-predictor/'), {
    canonical: undefined,
    image: '/stock-predictor/social-preview.png',
    sitemap: undefined,
  });
  assert.equal(robotsTxt(undefined), 'User-agent: *\nAllow: /\n');
  assert.doesNotMatch(sitemapXml(undefined), /<loc>|localhost|undefined/);
});

test('crawler discovery points at the same canonical page and prefixed sitemap', () => {
  const site = new URL('https://example.github.io/');
  assert.equal(robotsTxt(site, '/stock-predictor/'),
    'User-agent: *\nAllow: /\n\nSitemap: https://example.github.io/stock-predictor/sitemap.xml\n');
  const sitemap = sitemapXml(site, '/stock-predictor/');
  assert.match(sitemap, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  assert.match(sitemap, /<loc>https:\/\/example.github.io\/stock-predictor\/<\/loc>/);
  assert.equal((sitemap.match(/<url>/g) || []).length, 1);
});

test('sitemaps escape special characters in deployment paths', () => {
  assert.match(sitemapXml(new URL('https://markets.example/'), '/stocks&crypto/'),
    /<loc>https:\/\/markets.example\/stocks&amp;crypto\/<\/loc>/);
});
