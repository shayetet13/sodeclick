// Socket.IO utility module to avoid circular dependencies
let io = null;

// Function to set the Socket.IO instance
function setSocketInstance(socketInstance) {
  io = socketInstance;
}

// Function to get the Socket.IO instance
function getSocketInstance() {
  return io;
}

module.exports = {
  setSocketInstance,
  getSocketInstance
};
