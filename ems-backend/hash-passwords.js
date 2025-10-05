// hash-passwords.js

const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function hashAllPasswords() {
  console.log('🔐 Starting password hashing process...\n');

  try {
    // Get all users with plaintext passwords (passwords that don't start with $2)
    const { rows: users } = await pool.query(`
      SELECT id, email, password, name 
      FROM users 
      WHERE password NOT LIKE '$2%'
      AND email != 'deleted@system.local'
      ORDER BY id
    `);

    console.log(`Found ${users.length} users with plaintext passwords:\n`);

    if (users.length === 0) {
      console.log('✅ All passwords are already hashed!');
      process.exit(0);
    }

    // Show users before processing
    users.forEach(u => {
      console.log(`  - ${u.name} (${u.email})`);
    });

    console.log('\n📝 Processing...\n');

    // Hash each password
    for (const user of users) {
      const plaintextPassword = user.password;
      const hashedPassword = await bcrypt.hash(plaintextPassword, 12);
      
      await pool.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, user.id]
      );
      
      console.log(`✅ ${user.name} (${user.email})`);
      console.log(`   Original: ${plaintextPassword}`);
      console.log(`   Hashed: ${hashedPassword.substring(0, 20)}...`);
      console.log('');
    }

    console.log('🎉 All passwords have been hashed successfully!');
    console.log('\n⚠️  IMPORTANT: Save the plaintext passwords above if you need them for testing.');
    
  } catch (err) {
    console.error('❌ Error hashing passwords:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

hashAllPasswords();