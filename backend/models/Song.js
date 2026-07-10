const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Song name is required'],
      trim: true,
    },
    artist: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Image is required'],
      trim: true,
    }, // For example: "/images/img1.jpg" or an iTunes cover image URL.
    file: {
      type: String,
      required: [true, 'Audio file is required'],
      trim: true,
    }, // For example: "/songs/song1.mp3" or an iTunes preview URL.
    desc: {
      type: String,
      default: '',
      trim: true,
    },
    duration: {
      type: String,
      default: '0:00',
      trim: true,
    },
    genre: {
      type: String,
      default: 'Other',
      trim: true,
    },
    album: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Album',
      default: null,
    },
    // Track source: locally uploaded or retrieved from an external API.
    source: {
      type: String,
      enum: ['local', 'itunes'],
      default: 'local',
    },
    // External track ID used to prevent duplicates during repeated searches.
    externalId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Song', songSchema);