import {robotsTxt} from '../lib/seo.js';

export function GET({site}) {
  return new Response(robotsTxt(site, import.meta.env.BASE_URL), {
    headers: {'Content-Type': 'text/plain; charset=utf-8'},
  });
}
