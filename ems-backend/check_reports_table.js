const pool = require('./config/db');

async function checkReportsTable() {
  try {
    // Check if reports table exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reports'
      );
    `);
    
    const tableExists = result.rows[0].exists;
    console.log('Reports table exists:', tableExists);
    
    if (tableExists) {
      // Count records in reports table
      const countResult = await pool.query('SELECT COUNT(*) FROM reports');
      console.log('Number of records in reports table:', countResult.rows[0].count);
      
      // Get sample records
      const sampleResult = await pool.query('SELECT * FROM reports LIMIT 5');
      console.log('Sample records:', sampleResult.rows);
    }
    
    // Check if users table exists
    const usersResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const usersTableExists = usersResult.rows[0].exists;
    console.log('Users table exists:', usersTableExists);
    
    if (usersTableExists) {
      // Count records in users table
      const usersCountResult = await pool.query('SELECT COUNT(*) FROM users');
      console.log('Number of records in users table:', usersCountResult.rows[0].count);
      
      // Get sample records
      const usersSampleResult = await pool.query('SELECT id, username, role FROM users LIMIT 5');
      console.log('Sample users:', usersSampleResult.rows);
    }
    
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    pool.end();
  }
}

checkReportsTable(); 