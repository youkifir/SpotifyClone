const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Кому адресоване сповіщення
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Тип події
    type: {
      type: String,
      enum: ['new_song', 'new_album'],
      required: true,
    },
    // Хто викликав подію (музикант)
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Назва пісні / альбому
    title: { type: String, required: true },
    // Ім'я артиста
    artist: { type: String, default: '' },
    // ID сутності (пісні або альбому) для переходу
    entityId: { type: String, default: null },
    // Прочитано чи ні
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
