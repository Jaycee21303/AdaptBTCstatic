import { readFile, writeFile } from 'node:fs/promises';

const dataPath = new URL('../assets/data/education-topics.json', import.meta.url);
const htmlPath = new URL('../learning.html', import.meta.url);
const jsPath = new URL('../assets/data/education-topics.js', import.meta.url);

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const topics = JSON.parse(await readFile(dataPath, 'utf8'));
const cards = topics
  .map((topic) => {
    const keywords = Array.isArray(topic.keywords) ? topic.keywords.join(' ') : '';
    return `      <a class="education-card" href="education/${escapeHtml(topic.slug)}.html" data-title="${escapeHtml(
      topic.title
    )}" data-description="${escapeHtml(topic.description)}" data-keywords="${escapeHtml(keywords)}">
        <h3>${escapeHtml(topic.title)}</h3>
        <p class="muted">${escapeHtml(topic.description)}</p>
      </a>`;
  })
  .join('\n');

const html = await readFile(htmlPath, 'utf8');
const startMarker = '<!-- EDUCATION_CARDS_START -->';
const endMarker = '<!-- EDUCATION_CARDS_END -->';

if (!html.includes(startMarker) || !html.includes(endMarker)) {
  throw new Error('Education hub markers not found in learning.html');
}

const updated = html.replace(
  new RegExp(`${startMarker}[\\s\\S]*${endMarker}`),
  `${startMarker}\n${cards}\n      ${endMarker}`
);

await writeFile(htmlPath, updated);

const jsPayload = `window.educationTopics = ${JSON.stringify(topics, null, 2)};\\n`;
await writeFile(jsPath, jsPayload);
