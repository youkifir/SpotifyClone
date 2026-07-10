require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

// Run: npm run seed:admin
// Values can be overridden in the .env file
// (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_USERNAME).
// Otherwise, the default values below will be used.
const run = async () => {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || 'admin@spotifyclone.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin12345';
  const username = process.env.ADMIN_USERNAME || 'admin';

  const existing = await User.findOne({ email });

  if (existing) {
    console.log('⚠️ A user with this email already exists:', email);

    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log('   User role updated to admin.');
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

  console.log('✅ Administrator created successfully:');
  console.log(`   email:    ${admin.email}`);
  console.log(`   password: ${password} (change it after the first login)`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Error while creating administrator:', err.message);
  process.exit(1);
});