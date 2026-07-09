const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String, required: true }, // например "/images/img8.jpg"
    desc: { type: String, default: '' },
    bgColor: { type: String, default: '#333333' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Album', albumSchema);
