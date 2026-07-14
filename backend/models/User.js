const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: function () {
        // Пароль обязателен только если нет googleId (или другого провайдера)
        return !this.googleId;
      }
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'musician'],
      default: 'user',
    },
    likedSongs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song',
      },
    ],
    avatar: {
      type: String,
      default: null,
    },
    musicianRequest: {
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: null },
      message: { type: String, default: '' },
      requestedAt: { type: Date },
    },
    // Старе поле — залишаємо для сумісності
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Нове поле — підписки на артистів по імені (працює з iTunes та local)
    followingArtists: [
      {
        type: String,
        trim: true,
      },
    ],
    // Історія прослуховування
    listenHistory: [
      {
        song: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Song',
        },
        listenedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    googleId: {
      type: String,
      default: null,
    },
    facebookId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);