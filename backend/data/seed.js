// Скрипт наполнения базы данных.
// Запуск: node data/seed.js
// (выполнять из папки backend)

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

// file и image указывают на папку public фронтенда (см. пояснение в чате)
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
    console.log('✅ Подключено к MongoDB для сида');

    await Album.deleteMany();
    await Song.deleteMany();
    console.log('🗑️  Старые данные удалены');

    const createdAlbums = await Album.insertMany(albumsData);
    console.log(`✅ Добавлено альбомов: ${createdAlbums.length}`);

    // Первую песню привяжем к первому альбому просто для примера связи
    const songsWithAlbum = songsData.map((song, i) => ({
      ...song,
      album: createdAlbums[i % createdAlbums.length]._id,
    }));

    const createdSongs = await Song.insertMany(songsWithAlbum);
    console.log(`✅ Добавлено песен: ${createdSongs.length}`);

    console.log('🎉 Готово!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка при сидировании:', err.message);
    process.exit(1);
  }
};

runSeed();
