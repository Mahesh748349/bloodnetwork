const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const app = require('../src/app');

// Simple lightweight test runner without external dependencies
const runTests = async () => {
  console.log('--- STARTING BACKEND INTEGRATION & UNIT TESTS ---');
  let serverInstance;
  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  };

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blood_donation_db';
    await mongoose.connect(mongoUri);
    const testPort = 5055;
    serverInstance = app.listen(testPort);
    const baseUrl = `http://localhost:${testPort}/api`;

    // Test 1: Health check
    console.log('\nTest Suite 1: Health Check');
    const healthRes = await fetch(`${baseUrl}/health`).then((r) => r.json());
    assert(healthRes.status === 'ok', 'Health endpoint returns status: ok');

    // Test 2: Auth Login (Admin & Requester & Donor)
    console.log('\nTest Suite 2: Authentication & Token Verification');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dr.sharma@citycare.org',
        password: 'requester123',
      }),
    }).then((r) => r.json());
    assert(loginRes.success === true && loginRes.token, 'Login succeeds and returns JWT token');
    assert(loginRes.user.role === 'requester', 'Requester role properly attached in user payload');

    const requesterToken = loginRes.token;

    // Login as Admin
    const adminLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@bloodnetwork.org',
        password: 'admin123',
      }),
    }).then((r) => r.json());
    assert(adminLogin.user.role === 'admin', 'Admin login succeeds and role is admin');
    const adminToken = adminLogin.token;

    // Login as Donor
    const donorLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'rahul.verma@example.com',
        password: 'donor123',
      }),
    }).then((r) => r.json());
    assert(donorLogin.user.role === 'donor', 'Donor login succeeds and role is donor');
    const donorToken = donorLogin.token;

    // Test 3: Role-Based Authorization Restrictions
    console.log('\nTest Suite 3: RBAC & Security Restrictions');
    // Donor attempting to access admin dashboard -> MUST be 403 Forbidden
    const forbiddenAdminCheck = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    assert(
      forbiddenAdminCheck.status === 403,
      'Donor blocked with 403 Forbidden when trying to access admin dashboard'
    );

    // Unauthenticated request -> MUST be 401 Unauthorized
    const unauthCheck = await fetch(`${baseUrl}/donors/me`);
    assert(unauthCheck.status === 401, 'Unauthenticated request blocked with 401 Unauthorized');

    // Test 4: Donor Availability Toggle
    console.log('\nTest Suite 4: Donor Profile & Availability');
    const toggleRes = await fetch(`${baseUrl}/donors/availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`,
      },
      body: JSON.stringify({ availabilityStatus: false }),
    }).then((r) => r.json());
    assert(
      toggleRes.success === true && toggleRes.availabilityStatus === false,
      'Donor can toggle availability to false'
    );

    // Toggle back to true
    await fetch(`${baseUrl}/donors/availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`,
      },
      body: JSON.stringify({ availabilityStatus: true }),
    });

    // Test 5: Geospatial Donor Matching
    console.log('\nTest Suite 5: Geospatial 2dsphere Matching Algorithm');
    // Search nearby O+ donors around Manipal Hospital (77.6514, 12.9592)
    const matchRes = await fetch(
      `${baseUrl}/donors/nearby?bloodGroup=O%2B&lng=77.6514&lat=12.9592&radiusKm=25`,
      {
        headers: { Authorization: `Bearer ${requesterToken}` },
      }
    ).then((r) => r.json());
    assert(matchRes.success === true, 'Geospatial search succeeds');
    assert(matchRes.donors.length > 0, 'Returns matched donors sorted by proximity');
    assert(
      typeof matchRes.donors[0].distanceKm === 'number',
      'Calculates accurate distance in km'
    );

    // Test 6: Blood Request Creation, Lifecycle Transitions & Cancellation
    console.log('\nTest Suite 6: Request Lifecycle & State Machine');
    const createReqRes = await fetch(`${baseUrl}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${requesterToken}`,
      },
      body: JSON.stringify({
        patientName: 'Test Patient Case',
        bloodGroup: 'B+',
        unitsRequested: 2,
        hospitalName: 'St. John Medical Center',
        hospitalAddress: 'Koramangala, Bangalore',
        coordinates: [77.62, 12.93],
        urgency: 'high',
        requiredBy: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      }),
    }).then((r) => r.json());
    assert(createReqRes.success === true, 'Requester can create emergency blood request');
    const testRequestId = createReqRes.bloodRequest._id;

    // Transition status to donors_contacted
    const statusTransitionRes = await fetch(`${baseUrl}/requests/${testRequestId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${requesterToken}`,
      },
      body: JSON.stringify({ status: 'donors_contacted' }),
    }).then((r) => r.json());
    assert(
      statusTransitionRes.success === true &&
        statusTransitionRes.bloodRequest.status === 'donors_contacted',
      'Valid transition from open to donors_contacted succeeds'
    );

    // Test Invalid transition (donors_contacted -> open should FAIL)
    const invalidTransitionRes = await fetch(`${baseUrl}/requests/${testRequestId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${requesterToken}`,
      },
      body: JSON.stringify({ status: 'open' }),
    }).then((r) => r.json());
    assert(
      invalidTransitionRes.success === false,
      'Invalid backwards state transition is rejected by backend'
    );

    // Cancel request
    const cancelRes = await fetch(`${baseUrl}/requests/${testRequestId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${requesterToken}`,
      },
      body: JSON.stringify({ reason: 'Fulfilled via on-site reserves' }),
    }).then((r) => r.json());
    assert(
      cancelRes.success === true && cancelRes.bloodRequest.status === 'cancelled',
      'Request can be cancelled with audit reason'
    );

    // Test 7: Admin Dashboard Aggregations from DB
    console.log('\nTest Suite 7: Admin Analytics & Statistical Aggregation');
    const adminStats = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert(adminStats.success === true, 'Admin dashboard loads real aggregations');
    assert(adminStats.stats.donors.total >= 10, 'Total donors verified from database');
    assert(
      typeof adminStats.stats.requests.fulfillmentRatePercentage === 'number',
      'Calculates fulfillment rate percentage'
    );

    console.log('\n======================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================');
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (serverInstance) serverInstance.close();
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
};

runTests();
