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
      enum: ['user', 'admin', 'musician'],
      default: 'user',
    },
    likedSongs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song',
      },
    ],
    musicianRequest: {
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: null },
      message: { type: String, default: '' },
      requestedAt: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);