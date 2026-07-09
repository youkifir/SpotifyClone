require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

// Запуск: npm run seed:admin
// Данные можно переопределить через .env (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_USERNAME),
// иначе используются значения по умолчанию ниже.
const run = async () => {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || 'admin@spotifyclone.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin12345';
  const username = process.env.ADMIN_USERNAME || 'admin';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log('⚠️  Користувач з таким email вже існує:', email);
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log('   Роль оновлено на admin.');
    }
    await mongoose.disconnect();
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const admin = await User.create({
    username,
    email,
    password: hashedPassword,
    role: 'admin',
  });

  console.log('✅ Адміністратора створено:');
  console.log(`   email:    ${admin.email}`);
  console.log(`   password: ${password} (обов'язково змініть після першого входу)`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Помилка створення адміна:', err.message);
  process.exit(1);
});
