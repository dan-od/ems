const fetch = require('node-fetch');

async function testReportsAPI() {
  try {
    // First, get a token by logging in
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@wfsl.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    console.log('Login successful, token received');
    
    // Now try to fetch reports with the token
    const reportsResponse = await fetch('http://localhost:3001/api/reports', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!reportsResponse.ok) {
      const errorText = await reportsResponse.text();
      throw new Error(`Failed to fetch reports: ${reportsResponse.status} ${errorText}`);
    }
    
    const reportsData = await reportsResponse.json();
    console.log('Reports fetched successfully:');
    console.log(JSON.stringify(reportsData, null, 2));
    
  } catch (error) {
    console.error('Error testing reports API:', error);
  }
}

testReportsAPI(); 