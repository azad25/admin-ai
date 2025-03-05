import { io } from 'socket.io-client';

// Configuration - try different paths
const WS_URL = 'http://localhost:3000';
// Update paths to test - Socket.IO expects paths without trailing slashes
const paths = ['/ws', '/socket.io'];
const USER_ID = 'test-user-' + Math.floor(Math.random() * 10000);

console.log('WebSocket Debug Client');
console.log('---------------------');
console.log(`URL: ${WS_URL}`);
console.log(`Testing paths: ${paths.join(', ')}`);
console.log(`User ID: ${USER_ID}`);
console.log('---------------------');

// Test each path
async function testPath(path) {
  return new Promise((resolve) => {
    console.log(`\nTesting path: ${path}`);
    console.log('Connecting to WebSocket server...');
    
    const socket = io(WS_URL, {
      path: path,
      reconnection: true,
      reconnectionAttempts: 2,
      reconnectionDelay: 1000,
      timeout: 5000,
      autoConnect: true,
      forceNew: true,
      transports: ['websocket', 'polling'],
    });
    
    let connected = false;
    let timeout = setTimeout(() => {
      if (!connected) {
        console.log(`❌ Connection timeout for path: ${path}`);
        socket.disconnect();
        resolve(false);
      }
    }, 5000);
    
    // Connection events
    socket.on('connect', () => {
      connected = true;
      clearTimeout(timeout);
      console.log(`✅ Connected successfully using path: ${path}`);
      console.log(`Socket ID: ${socket.id}`);
      console.log(`Transport: ${socket.io.engine.transport.name}`);
      
      // Register with the server
      console.log(`Registering user ${USER_ID}...`);
      socket.emit('register', USER_ID);
      
      // Wait a bit then disconnect
      setTimeout(() => {
        console.log(`Test complete for path: ${path}, disconnecting...`);
        socket.disconnect();
        resolve(true);
      }, 2000);
    });
    
    socket.on('connect_error', (error) => {
      console.error(`❌ Connection error for path ${path}:`, error.message);
      console.log('Connection details:', { 
        url: WS_URL, 
        path: path,
        transport: socket.io?.engine?.transport?.name || 'unknown',
      });
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`Disconnected from ${path}: ${reason}`);
    });
    
    socket.on('register:confirmed', (data) => {
      console.log('✅ Registration confirmed:', data);
    });
    
    // Handle any other events
    socket.onAny((event, ...args) => {
      if (event !== 'connect_error') { // We already log this one
        console.log(`Event received on ${path}: ${event}`, args);
      }
    });
  });
}

// Test HTTP endpoints first
async function testHttpEndpoints() {
  console.log('\nTesting HTTP endpoints first:');
  
  try {
    console.log('\nTesting /health endpoint:');
    const healthResponse = await fetch(`${WS_URL}/health`);
    console.log(`Status: ${healthResponse.status}`);
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log('Health check response:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('Error testing /health endpoint:', error.message);
  }
  
  try {
    console.log('\nTesting /socket.io/ endpoint:');
    const socketResponse = await fetch(`${WS_URL}/socket.io/`);
    console.log(`Status: ${socketResponse.status}`);
    if (socketResponse.ok) {
      const text = await socketResponse.text();
      console.log('Response:', text);
    }
  } catch (error) {
    console.error('Error testing /socket.io/ endpoint:', error.message);
  }
  
  try {
    console.log('\nTesting /ws/ endpoint:');
    const wsResponse = await fetch(`${WS_URL}/ws/`);
    console.log(`Status: ${wsResponse.status}`);
    if (wsResponse.ok) {
      const text = await wsResponse.text();
      console.log('Response:', text);
    }
  } catch (error) {
    console.error('Error testing /ws/ endpoint:', error.message);
  }
}

// Run all tests
async function runTests() {
  try {
    // Test HTTP endpoints first
    await testHttpEndpoints();
    
    // Test each WebSocket path
    console.log('\nTesting WebSocket paths:');
    for (const path of paths) {
      const success = await testPath(path);
      console.log(`Path ${path} test ${success ? 'succeeded' : 'failed'}`);
    }
    
    console.log('\nAll tests completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('Interrupted, cleaning up...');
  process.exit(0);
});

// Run the tests
runTests(); 