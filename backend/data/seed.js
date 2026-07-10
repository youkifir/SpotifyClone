// Database seeding script.
// Run: node data/seed.js
// (run this command from the backend folder)

require('dotenv').config();
const mongoose = require('mongoose');
const Album = require('../models/Album');
const Song = require('../models/Song');

const albumsData = [
  { name: 'Top 50 Global', image: '/images/img8.jpg', desc: 'Your weekly update of the most played tracks', bgColor: '#2a4365' },
  { name: 'Top 50 India', image: '/images/img9.jpg', desc: 'Your weekly update of the most played tracks', bgColor: '#22543d' },
  { name: 'Trending India', image: '/images/img10.jpg', desc: 'Your weekly update of the most played tracks', bgColor: '#742a2a' },
  { name: 'Trending Global', image: '/images/img16.jpg', desc: 'Your weekly update of the most played tracks', bgColor: '#44337a' },
  { name: 'Mega Hits', image: '/images/img11.jpg', desc: 'Your weekly update of the most played tracks', bgColor: '#234e52' },
  { name: 'Happy Favorites', image: '/images/img15.jpg', desc: 'Your weekly update of the most played tracks', bgColor: '#744210' },
];

// The file and image paths point to the frontend public folder.
const songsData = [
  { name: 'Song One', image: '/images/img1.jpg', file: '/songs/song1.mp3', desc: 'Put a smile on your face with these happy tunes', duration: '3:00', genre: 'Pop' },
  { name: 'Song Two', image: '/images/img2.jpg', file: '/songs/song2.mp3', desc: 'Put a smile on your face with these happy tunes', duration: '2:20', genre: 'Pop' },
  { name: 'Song Three', image: '/images/img3.jpg', file: '/songs/song3.mp3', desc: 'Put a smile on your face with these happy tunes', duration: '2:32', genre: 'Hip-Hop' },
  { name: 'Song Four', image: '/images/img4.jpg', file: '/songs/song1.mp3', desc: 'Put a smile on your face with these happy tunes', duration: '2:50', genre: 'Hip-Hop' },
  { name: 'Song Five', image: '/images/img5.jpg', file: '/songs/song2.mp3', desc: 'Put a smile on your face with these happy tunes', duration: '3:10', genre: 'Electronic' },
  { name: 'Song Six', image: '/images/img14.jpg', file: '/songs/song3.mp3', desc: 'Put a smile on your face with these happy tunes', duration: '2:45', genre: 'Electronic' },
  { name: 'Song Seven', image: '/images/img7.jpg', file: '/songs/song1.mp3', desc: 'Put a smile on your face with these happy tunes', duration: '2:18', genre: 'Rock' },
  { name: 'Song Eight', image: '/images/img12.jpg', file: '/songs/song2.mp3', desc: 'Put a smile on your face with these happy tunes', duration: '2:35', genre: 'Rock' },
];

const runSeed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding');

    await Album.deleteMany();
    await Song.deleteMany();
    console.log('🗑️ Previous data deleted');

    const createdAlbums = await Album.insertMany(albumsData);
    console.log(`✅ Albums added: ${createdAlbums.length}`);

    // Assign each song to an album to demonstrate the relationship.
    const songsWithAlbum = songsData.map((song, index) => ({
      ...song,
      album: createdAlbums[index % createdAlbums.length]._id,
    }));

    const createdSongs = await Song.insertMany(songsWithAlbum);
    console.log(`✅ Songs added: ${createdSongs.length}`);

    console.log('🎉 Seeding completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    process.exit(1);
  }
};

runSeed();