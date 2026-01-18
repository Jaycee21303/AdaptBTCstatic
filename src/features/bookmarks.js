const STORAGE_KEY = 'adaptbtc_bookmarks_v1';

const readBookmarks = () => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const writeBookmarks = (bookmarks) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch (error) {
    // ignore storage errors
  }
};

export const getBookmarks = () => readBookmarks();

export const isBookmarked = (slug) => readBookmarks().includes(slug);

export const toggleBookmark = (slug) => {
  const bookmarks = readBookmarks();
  const index = bookmarks.indexOf(slug);
  if (index >= 0) {
    bookmarks.splice(index, 1);
  } else {
    bookmarks.push(slug);
  }
  writeBookmarks(bookmarks);
  return bookmarks;
};
