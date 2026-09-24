import axios from 'axios';

const API_URL = 'http://localhost:4000/api/flash-sale/buy';
const ITEM_ID = 'flash_burger_gold';
const CONCURRENT_USERS = 50; // 50 users trying to buy 1 item at the exact same time

async function simulateUserPurchase(userId: number) {
  try {
    const response = await axios.post(API_URL, {
      itemId: ITEM_ID,
      userId: userId,
    });
    return { userId, status: 'SUCCESS', data: response.data };
  } catch (error: any) {
    return { 
      userId, 
      status: 'FAILED', 
      error: error.response?.data?.error || error.message,
      layer: error.response?.data?.concurrencyLayer
    };
  }
}

async function runConcurrencyTest() {
  console.log(`\n🔥 Starting Concurrency Test: ${CONCURRENT_USERS} users fighting for 1 item...\n`);

  // Create an array of 50 parallel promises
  const promises = Array.from({ length: CONCURRENT_USERS }, (_, i) => 
    simulateUserPurchase(i + 1)
  );

  // Wait for all of them to finish simultaneously
  const results = await Promise.allSettled(promises);

  let successes = 0;
  let failures = 0;
  let lockRejections = 0;
  let soldOuts = 0;

  results.forEach(result => {
    if (result.status === 'fulfilled') {
      const res = result.value;
      if (res.status === 'SUCCESS') {
        successes++;
        console.log(`✅ User ${res.userId}: PURCHASED!`);
      } else {
        failures++;
        if (res.layer === 'redis_lock_rejected') lockRejections++;
        if (res.error?.includes('SOLD OUT')) soldOuts++;
      }
    }
  });

  console.log('\n-----------------------------------------');
  console.log('📊 CONCURRENCY TEST RESULTS:');
  console.log(`Total Requests:   ${CONCURRENT_USERS}`);
  console.log(`✅ Successes:      ${successes} (Expected: 1)`);
  console.log(`❌ Failures:       ${failures} (Expected: 49)`);
  console.log(`🔒 Lock Rejections: ${lockRejections}`);
  console.log(`🚫 Sold Out Errors: ${soldOuts}`);
  console.log('-----------------------------------------\n');

  if (successes === 1) {
    console.log('🎉 SUCCESS! The system prevented overselling under heavy parallel load.');
  } else {
    console.log('⚠️  WARNING: Overselling detected or system failed.');
  }
}

runConcurrencyTest();