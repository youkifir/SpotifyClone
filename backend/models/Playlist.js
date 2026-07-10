const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' }, // если пусто — на фронте можно ставить дефолтную обложку
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    isPublic: { type: Boolean, default: false }, // на будущее: публичные плейлисты, которые видно другим
  },
  { timestamps: true }
);

module.exports = mongoose.model('Playlist', playlistSchema);
