// Migration script: fix broken image URLs in MongoDB
// Run from backend folder: node data/migrateImages.js
//
// What it does:
//  - Finds all Songs, Albums, Playlists where image is a relative path
//    (e.g. "uploads/images/xxx.jpg" or "/uploads/images/xxx.jpg")
//    and prepends "http://localhost:5000/" to make it absolute.
//  - Skips records that already have http/https or empty image.
//  - Logs every change so you can verify.

require('dotenv').config();
const mongoose = require('mongoose');
const Song     = require('../models/Song');
const Album    = require('../models/Album');
const Playlist = require('../models/Playlist');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

function toAbsolute(url) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url; // already absolute
  }
  // Remove leading slash if present, then prepend base
  const clean = url.startsWith('/') ? url.slice(1) : url;
  return `${BASE_URL}/${clean}`;
}

async function migrateModel(Model, name) {
  // Find all docs where image doesn't start with http/https/data or is empty
  const docs = await Model.find({
    image: { $exists: true, $nin: ['', null] },
    $nor: [
      { image: /^https?:\/\// },
      { image: /^data:/ },
    ],
  });

  console.log(`\n📦 ${name}: знайдено ${docs.length} записів з відносними URL`);

  let updated = 0;
  for (const doc of docs) {
    const oldImage = doc.image;
    const newImage = toAbsolute(oldImage);
    if (newImage !== oldImage) {
      doc.image = newImage;
      await doc.save();
      console.log(`  ✅ ${doc.name || doc._id}: "${oldImage}" → "${newImage}"`);
      updated++;
    }
  }

  if (updated === 0) console.log(`  ℹ️  Нічого не потребує змін`);
  else console.log(`  🎉 Оновлено: ${updated} записів`);
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Підключено до MongoDB');

    await migrateModel(Song,     'Songs');
    await migrateModel(Album,    'Albums');
    await migrateModel(Playlist, 'Playlists');

    console.log('\n✅ Міграція завершена успішно!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Помилка міграції:', err.message);
    process.exit(1);
  }
}

run();