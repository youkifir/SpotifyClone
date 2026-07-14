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
    // ИЗМЕНЕНИЕ 1: Пароль теперь обязателен только если нет ID от Google или Facebook
    password: {
      type: String,
      required: function () {
        // Если это обычная регистрация (нет googleId и facebookId), пароль обязателен
        return !this.googleId && !this.facebookId;
      },
      select: false,
    },
    // ИЗМЕНЕНИЕ 2: Добавляем поля для хранения ID провайдеров авторизации
    googleId: {
      type: String,
      default: null,
      sparse: true, // Позволяет делать поле уникальным, даже если у большинства там null
    },
    facebookId: {
      type: String,
      default: null,
      sparse: true,
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
    // Підписки на артистів
    followedArtists: { type: [{ type: String, trim: true }], default: [] },
    // Історія прослуховування
    listenHistory: [
      {
        song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
        listenedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);