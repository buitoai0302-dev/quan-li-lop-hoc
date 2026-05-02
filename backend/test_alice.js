async function testAlice() {
  try {
    // Login
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@student.com',
        password: '123456'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login success');

    // Get schedule
    const scheduleRes = await fetch('http://localhost:3000/api/schedule?weekStart=2026-05-01', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const scheduleData = await scheduleRes.json();
    if (!scheduleRes.ok) {
      console.error('API Error:', scheduleRes.status, scheduleData);
    } else {
      console.log('Schedule data:', scheduleData);
    }
  } catch (err) {
    console.error('Request failed:', err.message);
  }
}

testAlice();
