require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const connectDB = require('./config/db');

const songRoutes     = require('./routes/songRoutes');
const albumRoutes    = require('./routes/albumRoutes');
const authRoutes     = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const adminRoutes    = require('./routes/adminRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { protect, isAdmin, isMusician } = require('./middleware/auth');
const { proxyAIPlaylist } = require('./controllers/recommendedController');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

// ВАЖЛИВО: ліміт 10mb щоб base64 фото проходило
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── База даних ────────────────────────────────────────────────────────────────
connectDB();

// ── Папки для завантажень ─────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
const songsDir   = path.join(uploadsDir, 'songs');
const imagesDir  = path.join(uploadsDir, 'images');
[uploadsDir, songsDir, imagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Статичні файли — тільки зображення; аудіо захищено через /api/audio/stream/:id
app.use('/uploads/images', express.static(imagesDir));
app.use('/uploads/songs', (_req, res) => res.status(403).json({ success: false, message: 'Access denied. Use /api/audio/stream/:songId' }));

// ── Multer (завантаження файлів через /api/upload) ───────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/'))      cb(null, songsDir);
    else if (file.mimetype.startsWith('image/')) cb(null, imagesDir);
    else cb(new Error('Unsupported file type'), null);
  },
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, suffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/aac',
                     'image/jpeg','image/png','image/webp','image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type'));
  },
});

app.post('/api/upload', protect, isMusician, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
  const isAudio    = req.file.mimetype.startsWith('audio/');
  const relativePath = isAudio
    ? `uploads/songs/${req.file.filename}`
    : `uploads/images/${req.file.filename}`;
  res.json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      url:      `http://localhost:${PORT}/${relativePath}`,
      path:     relativePath,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size:     req.file.size,
    },
  });
});

// ── API роути ─────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/songs',     songRoutes);
app.use('/api/albums',    albumRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/admin',     adminRoutes);

// POST /api/ai-playlist — проксі до Claude API (API-ключ на сервері, не на фронті)
app.post('/api/ai-playlist', protect, proxyAIPlaylist);

// ── Захищений аудіо-стрімінг ─────────────────────────────────────────────────
// Всі аудіо-запити йдуть через цей маршрут з JWT-токеном
// Пряме звернення до /uploads/songs/... заборонено для аудіофайлів
const Song = require('./models/Song');
const https = require('https');
const http  = require('http');

app.get('/api/audio/stream/:songId', protect, async (req, res) => {
  try {
    const song = await Song.findById(req.params.songId);
    if (!song) return res.status(404).json({ success: false, message: 'Song not found' });

    if (song.source === 'itunes') {
      // Проксіюємо iTunes URL — клієнт не бачить оригінальну URL
      const itunesUrl = song.file;
      if (!itunesUrl || !itunesUrl.startsWith('http')) {
        return res.status(400).json({ success: false, message: 'Invalid audio source' });
      }
      const protocol = itunesUrl.startsWith('https') ? https : http;
      const range = req.headers['range'];
      const reqHeaders = { 'User-Agent': 'Mozilla/5.0' };
      if (range) reqHeaders['Range'] = range;

      protocol.get(itunesUrl, { headers: reqHeaders }, (upstream) => {
        res.status(upstream.statusCode || 200);
        // Перекидаємо потрібні заголовки
        ['content-type','content-length','content-range','accept-ranges'].forEach(h => {
          if (upstream.headers[h]) res.setHeader(h, upstream.headers[h]);
        });
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        upstream.pipe(res);
      }).on('error', () => res.status(502).json({ success: false, message: 'Upstream error' }));

    } else {
      // Локальний файл — стрімінг з диска з підтримкою range
      let filePath = song.file;
      // Normalize: може бути URL http://localhost:5000/uploads/... або відносний uploads/...
      if (filePath.startsWith('http')) {
        filePath = filePath.replace(/^https?:\/\/[^/]+\//, '');
      }
      const absPath = path.join(__dirname, filePath);
      if (!fs.existsSync(absPath)) {
        return res.status(404).json({ success: false, message: 'Audio file not found on disk' });
      }
      const stat = fs.statSync(absPath);
      const fileSize = stat.size;
      const range = req.headers['range'];

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'audio/mpeg');

      if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
        const start = parseInt(startStr, 10);
        const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
        const chunkSize = end - start + 1;
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', chunkSize);
        fs.createReadStream(absPath, { start, end }).pipe(res);
      } else {
        res.setHeader('Content-Length', fileSize);
        fs.createReadStream(absPath).pipe(res);
      }
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/', (_req, res) => res.json({ success: true, message: 'Backend працює!', data: null }));

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});