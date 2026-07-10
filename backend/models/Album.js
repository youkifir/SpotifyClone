const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Image is required'],
      trim: true,
    }, // For example: "/images/img8.jpg"
    desc: {
      type: String,
      default: '',
      trim: true,
    },
    bgColor: {
      type: String,
      default: '#333333',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Album', albumSchema);