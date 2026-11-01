import {sitemapXml} from '../lib/seo.js';

export function GET({site}) {
  return new Response(sitemapXml(site, import.meta.env.BASE_URL), {
    headers: {'Content-Type': 'application/xml; charset=utf-8'},
  });
}
