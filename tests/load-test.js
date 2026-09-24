import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for the presentation
const cacheHitRate = new Rate('cache_hits');
const bloomFilterTime = new Trend('bloom_filter_time', true);

// Test Configuration
export const options = {
  stages: [
    { duration: '10s', target: 50 },   // Ramp up to 50 users
    { duration: '30s', target: 200 },  // Stay at 200 concurrent users (High Traffic)
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must finish in < 500ms
    cache_hits: ['rate>0.8'],         // At least 80% of restaurant reads should hit Redis cache
  },
};

// Use host.docker.internal to reach your localhost API from inside the k6 Docker container
const BASE_URL = 'http://host.docker.internal:4000';

export default function () {
  // ==========================================
  // SCENARIO 1: Browse Restaurants (90% of traffic)
  // Course Mapping: Tests Redis Cache & Eventual Consistency
  // ==========================================
  const browseRes = http.get(`${BASE_URL}/api/restaurants?category=pizza`);
  
  check(browseRes, {
    'browse status is 200': (r) => r.status === 200,
  });

  if (browseRes.status === 200) {
    const json = browseRes.json();
    // Track if the request was served by Redis or MongoDB
    cacheHitRate.add(json.source === 'cache');
  }

  // ==========================================
  // SCENARIO 2: Check Username (10% of traffic)
  // Course Mapping: Tests Bloom Filter O(1) Constant Time
  // ==========================================
  const randomUser = `user_${Math.random().toString(36).substring(7)}`;
  const bloomRes = http.get(`${BASE_URL}/api/auth/check-username?username=${randomUser}`);
  
  check(bloomRes, {
    'bloom status is 200': (r) => r.status === 200,
  });

  if (bloomRes.status === 200) {
    const json = bloomRes.json();
    bloomFilterTime.add(json.data.responseTimeMs);
  }

  sleep(1); // Simulate user reading the page for 1 second
}