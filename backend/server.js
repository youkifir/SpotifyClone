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
const { protect, isAdmin } = require('./middleware/auth');

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

// Статичні файли (аудіо та зображення)
app.use('/uploads', express.static(uploadsDir));

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

app.post('/api/upload', protect, isAdmin, upload.single('file'), (req, res) => {
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

app.get('/', (_req, res) => res.json({ success: true, message: 'Backend працює!', data: null }));

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});