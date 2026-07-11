require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const songRoutes     = require('./routes/songRoutes');
const albumRoutes    = require('./routes/albumRoutes');
const authRoutes     = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const adminRoutes    = require('./routes/adminRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

connectDB();

app.use('/api/auth',      authRoutes);
app.use('/api/songs',     songRoutes);
app.use('/api/albums',    albumRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/admin',     adminRoutes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Backend працює!', data: null });
});

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
