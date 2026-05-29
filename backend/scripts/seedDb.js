require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function seedDatabase() {
  try {
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running schema and seed script...');
    await pool.query(sql);
    
    console.log('Database seeded successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    pool.end();
  }
}

seedDatabase();
