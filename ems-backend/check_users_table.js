const pool = require('./config/db');

async function checkUsersTable() {
  try {
    // Get column information for users table
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('Users table columns:');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
    
    // Get sample records
    const sampleResult = await pool.query('SELECT * FROM users LIMIT 5');
    console.log('\nSample users:');
    console.log(sampleResult.rows);
    
  } catch (error) {
    console.error('Error checking users table:', error);
  } finally {
    pool.end();
  }
}

checkUsersTable(); 