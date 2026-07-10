// Bulk import songs into the database using the iTunes API.
// Run: node data/bulkImport.js
// (run this command from the backend folder)

require('dotenv').config();
const mongoose = require('mongoose');
const Song = require('../models/Song');
const { searchItunes } = require('../utils/itunes');

// Add song titles or artist names here to preload them into the database.
// You can use a song title only, or "song title artist" for more accurate results.
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
  // Add as many queries as needed below.
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runBulkImport = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    let totalAdded = 0;

    for (const query of queries) {
      try {
        // Use only the first and most relevant result for each query.
        const results = await searchItunes(query, 1);

        if (results.length === 0) {
          console.log(`⚠️ No results found for: "${query}"`);
          continue;
        }

        const track = results[0];
        const exists = await Song.findOne({ externalId: track.externalId });

        if (exists) {
          console.log(`⏭️ Already in the database: ${track.name} — ${track.artist}`);
          continue;
        }

        await Song.create(track);
        totalAdded++;
        console.log(`✅ Added: ${track.name} — ${track.artist}`);
      } catch (err) {
        console.error(`❌ Error while processing "${query}":`, err.message);
      }

      // Add a short delay to avoid sending requests to the iTunes API too quickly.
      await sleep(300);
    }

    console.log(`\n🎉 Import completed. New songs added: ${totalAdded}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

runBulkImport();