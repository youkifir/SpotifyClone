// Wrapper for lyrics.ovh (free and does not require an API key).
// Coverage is not guaranteed: lyrics for less popular or niche tracks may be unavailable.
// Documentation: https://lyricsovh.docs.apiary.io/

const LYRICS_API_URL = 'https://api.lyrics.ovh/v1';

/**
 * Attempts to retrieve song lyrics by artist name and track title.
 * Returns the lyrics as a string, or null when no lyrics are found.
 */
async function fetchLyrics(artist, title) {
  if (!artist || !title) return null;

  const url = `${LYRICS_API_URL}/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;

  const response = await fetch(url);

  if (response.status === 404) return null; // Lyrics are not available in the lyrics.ovh database.

  if (!response.ok) {
    throw new Error(`lyrics.ovh returned status ${response.status}`);
  }

  const data = await response.json();
  return data.lyrics ? data.lyrics.trim() : null;
}

module.exports = { fetchLyrics };