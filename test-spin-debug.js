// Test script to debug spin wheel functionality
console.log('🎯 Spin Wheel Debug Test');

// Function to test API response format
function testSpinWheelAPI() {
  console.log('Testing spin wheel API response format...');
  
  // Example API responses that should work
  const validResponses = [
    { type: 'coins', amount: 100 },
    { type: 'votePoints', amount: 50 },
    { type: 'grand', coins: 500, votePoints: 500 }
  ];
  
  validResponses.forEach((response, index) => {
    console.log(`Test ${index + 1}:`, response);
    console.log('Should create prize object successfully');
  });
}

// Function to test state management
function testStateManagement() {
  console.log('Testing state management...');
  
  const states = {
    isSpinning: false,
    selectedPrize: { id: 'test', name: '100 เหรียญ', type: 'coins', amount: 100 },
    showPrizeResult: true,
    errorMessage: null
  };
  
  console.log('States for showing popup:', states);
  console.log('Condition check:', states.showPrizeResult && states.selectedPrize && !states.errorMessage);
}

testSpinWheelAPI();
testStateManagement();

console.log('🔍 Please check browser console for spin wheel logs when testing');
console.log('Look for these key messages:');
console.log('- 🚀 Starting API call...');
console.log('- 🎲 API Response:');
console.log('- 🎉 Showing prize result immediately:');
console.log('- ✅ POPUP SHOULD BE VISIBLE NOW!');
