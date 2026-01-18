import { readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const baseUrl = 'https://adaptbtc.com';
const educationDir = resolve('education');
const educationPages = readdirSync(educationDir).filter((file) => file.endsWith('.html'));

const urls = [
  `${baseUrl}/`,
  `${baseUrl}/learning.html`,
  `${baseUrl}/consulting.html`,
  `${baseUrl}/get-involved.html`,
  `${baseUrl}/tools/dca/`,
  `${baseUrl}/tools.html`,
  ...educationPages.map((file) => `${baseUrl}/education/${file}`),
];

const xmlEntries = urls.map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlEntries}\n</urlset>\n`;

writeFileSync('sitemap.xml', xml);
