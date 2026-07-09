// Массовая загрузка песен в базу через iTunes API.
// Запуск: node data/bulkImport.js
// (выполнять из папки backend)

require('dotenv').config();
const mongoose = require('mongoose');
const Song = require('../models/Song');
const { searchItunes } = require('../utils/itunes');

// Впишите сюда любые названия/исполнителей, которые хотите иметь в базе заранее.
// Можно писать просто название песни, или "название исполнитель" для точности.
const queries = [
  'Blinding Lights The Weeknd',
  'Shape of You Ed Sheeran',
  'Believer Imagine Dragons',
  'Bad Guy Billie Eilish',
  'Levitating Dua Lipa',
  'Stay Kid Laroi',
  'Sunflower Post Malone',
  'Someone Like You Adele',
  'Uptown Funk Bruno Mars',
  'Rolling in the Deep Adele',
  // добавляйте сколько угодно строк ниже
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runBulkImport = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Подключено к MongoDB');

    let totalAdded = 0;

    for (const query of queries) {
      try {
        // берём только первый (самый релевантный) результат на каждый запрос
        const results = await searchItunes(query, 1);
        if (results.length === 0) {
          console.log(`⚠️  Ничего не найдено: "${query}"`);
          continue;
        }

        const track = results[0];
        const exists = await Song.findOne({ externalId: track.externalId });
        if (exists) {
          console.log(`⏭️  Уже в базе: ${track.name} — ${track.artist}`);
          continue;
        }

        await Song.create(track);
        totalAdded++;
        console.log(`✅ Добавлено: ${track.name} — ${track.artist}`);
      } catch (err) {
        console.error(`❌ Ошибка на запросе "${query}":`, err.message);
      }

      // небольшая пауза между запросами, чтобы не спамить iTunes API слишком быстро
      await sleep(300);
    }

    console.log(`\n🎉 Готово! Добавлено новых песен: ${totalAdded}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка подключения:', err.message);
    process.exit(1);
  }
};

runBulkImport();
