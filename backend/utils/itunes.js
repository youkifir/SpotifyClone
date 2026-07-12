// Обёртка над iTunes Search API (бесплатный, без ключа).
// Документация: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';

/**
 * Ищет треки во внешнем каталоге iTunes по текстовому запросу.
 * Возвращает массив объектов в формате, совместимом с нашей моделью Song.
 */
async function searchItunes(query, limit = 10) {
  const url = `${ITUNES_SEARCH_URL}?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`iTunes API вернул статус ${response.status}`);
  }

  const data = await response.json();

  return data.results
    .filter((track) => track.previewUrl) // берём только те, где есть превью
    .map((track) => ({
      name: track.trackName,
      artist: track.artistName,
      // iTunes даёт маленькую обложку 100x100 — просим версию побольше
      image: track.artworkUrl100
        ? track.artworkUrl100.replace('100x100', '512x512')
        : '',
      file: track.previewUrl, // это 30-секундный превью-фрагмент, не полный трек
      duration: track.trackTimeMillis
        ? msToDuration(track.trackTimeMillis)
        : '0:30',
      desc: track.collectionName || '',
      genre: track.primaryGenreName || 'Other',
      source: 'itunes',
      externalId: String(track.trackId),
    }));
}

function msToDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = { searchItunes };
