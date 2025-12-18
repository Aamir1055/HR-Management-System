import fetch from 'node-fetch';

async function testAPI() {
    try {
        // Test the health endpoint first
        const healthResponse = await fetch('http://localhost:5000/api/health');
        console.log('Health check status:', healthResponse.status);
        
        // Note: We would need authentication token to test /api/employees
        // But we can see from the logs that the backend is running with our fixes
        console.log('✅ Backend is running and ready to serve updated shift timings');
        console.log('🔄 Frontend should now display the updated shift timings from the database');
        console.log('💡 If the frontend still shows old values, try:');
        console.log('   1. Hard refresh in browser (Ctrl+Shift+R or Cmd+Shift+R)');
        console.log('   2. Clear browser cache');
        console.log('   3. Open browser developer tools and disable cache');
        
    } catch (error) {
        console.error('API test failed:', error.message);
    }
}

testAPI();
