const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Song name is required'],
      trim: true,
    },
    artist: { type: String, default: '', trim: true },
    image: {
      type: String,
      required: [true, 'Image is required'],
      trim: true,
    },
    file: {
      type: String,
      required: [true, 'Audio file is required'],
      trim: true,
    },
    desc:     { type: String, default: '', trim: true },
    duration: { type: String, default: '0:00', trim: true },
    genre:    { type: String, default: 'Other', trim: true },
    album: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Album',
      default: null,
    },
    // Хто завантажив пісню (музикант або null для iTunes/seed)
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    source:     { type: String, enum: ['local', 'itunes'], default: 'local' },
    externalId: { type: String, default: null },
    // Лічильник прослуховувань — збільшується через POST /api/songs/:id/play
    playCount:  { type: Number, default: 0 },
    lyrics:     { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Song', songSchema);
