const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    isPublic: { type: Boolean, default: false },
    isLikedSongs: { type: Boolean, default: false },    // спеціальний системний плейлист
    isRecommended: { type: Boolean, default: false },   // плейлист від AI-рекомендацій (не показувати у сайдбарі)
  },
  { timestamps: true }
);

module.exports = mongoose.model('Playlist', playlistSchema);