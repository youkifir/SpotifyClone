const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    artist: { type: String, default: '' },
    image: { type: String, required: true }, // например "/images/img1.jpg" или ссылка на обложку из iTunes
    file: { type: String, required: true },  // например "/songs/song1.mp3" или превью-ссылка из iTunes
    desc: { type: String, default: '' },
    duration: { type: String, default: '0:00' },
    genre: { type: String, default: 'Other' },
    album: { type: mongoose.Schema.Types.ObjectId, ref: 'Album', default: null },
    // источник трека: своя загрузка или найдено через внешний API
    source: { type: String, enum: ['local', 'itunes'], default: 'local' },
    // id трека во внешнем каталоге — нужен, чтобы не сохранять дубликаты при повторном поиске
    externalId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Song', songSchema);
