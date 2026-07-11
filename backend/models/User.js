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
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'musician', 'admin'],
      default: 'user',
    },
    // Заявка на роль музиканта:
    // pending  — подана, чекає рішення адміна
    // approved — адмін схвалив (роль змінена на musician)
    // rejected — адмін відхилив
    // null     — заявки не було
    musicianRequest: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', null],
        default: null,
      },
      message: { type: String, default: '' }, // причина відмови від адміна
      requestedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
