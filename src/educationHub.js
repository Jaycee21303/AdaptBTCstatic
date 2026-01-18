import { fetchJson } from './lib/api.js';

const setTextIfChanged = (el, text) => {
  if (!el) return;
  if (el.textContent !== text) {
    el.textContent = text;
  }
};

const buildCardMarkup = (topic) => {
  const keywords = Array.isArray(topic.keywords) ? topic.keywords.join(' ') : '';
  return `
    <a class="education-card" href="education/${topic.slug}.html" data-title="${topic.title}" data-description="${
      topic.description
    }" data-keywords="${keywords}">
      <h3>${topic.title}</h3>
      <p class="muted">${topic.description}</p>
    </a>
  `;
};

const renderTopics = (container, topics) => {
  container.innerHTML = topics.map(buildCardMarkup).join('');
};

const getCardSearchText = (card) => {
  const title = card.getAttribute('data-title') || '';
  const description = card.getAttribute('data-description') || '';
  const keywords = card.getAttribute('data-keywords') || '';
  return `${title} ${description} ${keywords}`.toLowerCase();
};

export const initEducationHub = async () => {
  const cardsContainer = document.getElementById('educationCards');
  if (!cardsContainer) return;

  const searchInput = document.getElementById('educationSearch');
  const countLabel = document.getElementById('educationCount');
  const emptyState = document.getElementById('educationEmpty');

  let cards = Array.from(cardsContainer.querySelectorAll('.education-card'));

  if (!cards.length) {
    try {
      const { data } = await fetchJson('/assets/data/education-topics.json', { timeoutMs: 5000, retries: 1 });
      if (Array.isArray(data) && data.length) {
        renderTopics(cardsContainer, data);
        cards = Array.from(cardsContainer.querySelectorAll('.education-card'));
      }
    } catch (error) {
      // leave empty state visible
    }
  }

  const updateCount = (visibleCount) => {
    const count = Number.isFinite(visibleCount) ? visibleCount : cards.length;
    setTextIfChanged(countLabel, `${count} topic${count === 1 ? '' : 's'}`);
  };

  const filterTopics = () => {
    const query = searchInput?.value.trim().toLowerCase() || '';
    let visibleCount = 0;

    cards.forEach((card) => {
      const matches = !query || getCardSearchText(card).includes(query);
      card.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    if (emptyState) {
      emptyState.hidden = visibleCount !== 0;
    }

    updateCount(visibleCount);
  };

  updateCount(cards.length);

  if (searchInput) {
    searchInput.addEventListener('input', filterTopics);
  }
};
