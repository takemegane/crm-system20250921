// Test script for order creation
const testOrderCreation = async () => {
  console.log('Testing order creation...')
  
  try {
    // First test with missing authentication
    const response = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shippingAddress: '東京都渋谷区渋谷1-1-1',
        notes: 'テスト注文'
      })
    })
    
    console.log('Response status:', response.status)
    const data = await response.json()
    console.log('Response data:', data)
    
  } catch (error) {
    console.error('Test error:', error)
  }
}

testOrderCreation()