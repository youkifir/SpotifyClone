require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const songRoutes = require('./routes/songRoutes');
const albumRoutes = require('./routes/albumRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Подключение к MongoDB
connectDB();

// Роуты API
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/albums', albumRoutes);

// Тестовый маршрут
app.get('/', (req, res) => {
  res.json({ message: 'Backend работает!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
