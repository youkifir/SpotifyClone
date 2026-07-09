// Тестовый скрипт для проверки полного CRUD (Create/Read/Update/Delete)
// для моделей Album и Song через реальные HTTP-запросы к вашему backend.
//
// ВАЖНО: backend должен быть уже запущен (npm run dev) перед запуском этого скрипта.
//
// Запуск: node data/testCrud.js
// (выполнять из папки backend, в отдельном третьем терминале)

const BASE_URL = 'http://localhost:5000/api';

let step = 0;
const log = (title, data) => {
  step++;
  console.log(`\n[${step}] ${title}`);
  console.log(JSON.stringify(data, null, 2));
};

const request = async (method, path, body) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
};

const runTests = async () => {
  console.log('🧪 Начинаем проверку CRUD для Album и Song...\n');
  console.log('='.repeat(50));
  console.log('ALBUM CRUD');
  console.log('='.repeat(50));

  // CREATE альбома
  const createAlbumRes = await request('POST', '/albums', {
    name: '__TEST_ALBUM__',
    image: '/images/test.jpg',
    desc: 'Тестовый альбом для проверки CRUD',
    bgColor: '#123456',
  });
  log('CREATE альбом → ожидаем статус 201', createAlbumRes);
  const albumId = createAlbumRes.data._id;

  // READ (один альбом)
  const getAlbumRes = await request('GET', `/albums/${albumId}`);
  log('GET альбом по id → ожидаем статус 200', getAlbumRes);

  // UPDATE альбома
  const updateAlbumRes = await request('PUT', `/albums/${albumId}`, {
    name: '__TEST_ALBUM_UPDATED__',
  });
  log('UPDATE альбом (меняем name) → имя должно измениться', updateAlbumRes);

  console.log('\n' + '='.repeat(50));
  console.log('SONG CRUD');
  console.log('='.repeat(50));

  // CREATE песни, привязанной к тестовому альбому
  const createSongRes = await request('POST', '/songs', {
    name: '__TEST_SONG__',
    artist: 'Test Artist',
    image: '/images/test.jpg',
    file: '/songs/test.mp3',
    duration: '1:00',
    genre: 'Test',
    album: albumId,
  });
  log('CREATE песня → ожидаем статус 201', createSongRes);
  const songId = createSongRes.data._id;

  // READ (одна песня)
  const getSongRes = await request('GET', `/songs/${songId}`);
  log('GET песня по id → ожидаем статус 200', getSongRes);

  // UPDATE песни
  const updateSongRes = await request('PUT', `/songs/${songId}`, {
    duration: '2:00',
  });
  log('UPDATE песня (меняем duration) → duration должен стать "2:00"', updateSongRes);

  console.log('\n' + '='.repeat(50));
  console.log('ПРОВЕРКА ОБРАБОТКИ ОШИБОК (несуществующий id)');
  console.log('='.repeat(50));

  const fakeId = '000000000000000000000000'; // валидный формат ObjectId, но такого документа нет
  const notFoundRes = await request('GET', `/songs/${fakeId}`);
  log('GET несуществующая песня → ожидаем статус 404', notFoundRes);

  console.log('\n' + '='.repeat(50));
  console.log('DELETE (уборка за собой)');
  console.log('='.repeat(50));

  const deleteSongRes = await request('DELETE', `/songs/${songId}`);
  log('DELETE песня → ожидаем статус 200', deleteSongRes);

  const deleteAlbumRes = await request('DELETE', `/albums/${albumId}`);
  log('DELETE альбом → ожидаем статус 200', deleteAlbumRes);

  console.log('\n🎉 Все проверки выполнены. Смотрите выше — все статусы должны быть 200/201, кроме теста "несуществующий id" (там ожидается 404).');
};

runTests().catch((err) => {
  console.error('❌ Скрипт упал с ошибкой:', err.message);
  console.error('Проверьте, что backend запущен (npm run dev) в другом терминале.');
});
