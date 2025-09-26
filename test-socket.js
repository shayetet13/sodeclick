const { io } = require('socket.io-client');

console.log('🔌 Testing Socket.IO connection...');

const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
  timeout: 10000,
  reconnection: true,
  reconnectionAttempts: 3,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  console.log('✅ Socket.IO connected successfully!');
  console.log('🔌 Socket ID:', socket.id);
  console.log('🔌 Transport:', socket.io.engine.transport.name);
  
  // Test emit
  socket.emit('test-event', { message: 'Hello from test script' });
  
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket.IO connection error:', error.message);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('❌ Connection timeout');
  socket.disconnect();
  process.exit(1);
}, 10000);
