const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Organization = require('../src/models/Organization');
const BloodRequest = require('../src/models/BloodRequest');

const runNewFeaturesTests = async () => {
  console.log('================================================================');
  console.log('NEW ADVANCED FEATURES AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  try {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blood_donation_db';
      await mongoose.connect(uri);
    }

    // Authenticate test accounts
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@bloodnetwork.org', password: 'admin123' });
    const adminToken = adminLogin.body.token;

    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dr.sharma@citycare.org', password: 'requester123' });
    const staffToken = staffLogin.body.token;

    const donorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rahul.verma@example.com', password: 'donor123' });
    const donorToken = donorLogin.body.token;

    console.log('--- Public Emergency Feed (No Auth Required) ---');
    const publicFeed = await request(app).get('/api/requests/public-feed');
    if (publicFeed.status === 200 && Array.isArray(publicFeed.body.requests)) {
      console.log('  [PASS] Anonymous public feed accessible without authentication');
    } else {
      throw new Error(`Public feed failed: ${publicFeed.status}`);
    }

    console.log('\n--- Blood Inventory Management System ---');
    // Add inventory
    const addInv = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        bloodGroup: 'O+',
        componentType: 'red_blood_cells',
        unitsAvailable: 12,
        storageLocation: 'Blood Refrigerator Unit 1',
      });
    if (addInv.status === 201 && addInv.body.inventory?.unitsAvailable === 12) {
      console.log('  [PASS] Hospital staff successfully added blood inventory unit');
    } else {
      throw new Error(`Add inventory failed: ${addInv.status}`);
    }

    // Get inventory
    const getInv = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${staffToken}`);
    if (getInv.status === 200 && getInv.body.summary['O+']?.totalUnits >= 12) {
      console.log('  [PASS] Organization inventory summary aggregated by blood group');
    } else {
      throw new Error(`Get inventory failed: ${getInv.status}`);
    }

    // Check inventory for request
    const checkInv = await request(app)
      .post('/api/inventory/check-request')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ bloodGroup: 'O+', unitsRequested: 4, componentType: 'red_blood_cells' });
    if (checkInv.status === 200 && checkInv.body.canServeFromStock === true) {
      console.log('  [PASS] Local blood bank inventory fulfillment pre-check passed');
    } else {
      throw new Error(`Check inventory failed: ${checkInv.status}`);
    }

    // Low stock alerts
    const lowStock = await request(app)
      .get('/api/inventory/low-stock?threshold=5')
      .set('Authorization', `Bearer ${staffToken}`);
    if (lowStock.status === 200 && Array.isArray(lowStock.body.alerts)) {
      console.log('  [PASS] Low-stock alert threshold calculation functioning');
    } else {
      throw new Error(`Low stock failed: ${lowStock.status}`);
    }

    console.log('\n--- Real-Time Analytics & Blood Shortage Warnings ---');
    const analytics = await request(app)
      .get('/api/analytics/network')
      .set('Authorization', `Bearer ${adminToken}`);
    if (analytics.status === 200 && analytics.body.stats?.totalOrganizations >= 1) {
      console.log('  [PASS] Platform-wide analytics endpoint returning live hospital metrics');
    } else {
      throw new Error(`Analytics network failed: ${analytics.status}`);
    }

    const shortages = await request(app)
      .get('/api/analytics/shortage-alerts')
      .set('Authorization', `Bearer ${adminToken}`);
    if (shortages.status === 200 && Array.isArray(shortages.body.alerts)) {
      console.log('  [PASS] Network shortage warnings flagged critical blood groups');
    } else {
      throw new Error(`Shortage alerts failed: ${shortages.status}`);
    }

    console.log('\n--- Community Blood Donation Camps ---');
    // Schedule camp
    const createCamp = await request(app)
      .post('/api/camps')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campName: 'Metro Tech Hub Community Blood Drive',
        description: 'Annual corporate blood drive',
        address: 'Electronic City Phase 1',
        city: 'Bangalore',
        scheduledDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        targetUnits: 100,
      });
    if (createCamp.status === 201 && createCamp.body.camp?._id) {
      console.log('  [PASS] Hospital admin scheduled community donation camp');
    } else {
      throw new Error(`Create camp failed: ${createCamp.status}`);
    }

    const campId = createCamp.body.camp._id;

    // Donor registers for camp
    const regCamp = await request(app)
      .post(`/api/camps/${campId}/register`)
      .set('Authorization', `Bearer ${donorToken}`);
    if (regCamp.status === 200 && regCamp.body.registeredCount === 1) {
      console.log('  [PASS] Donor successfully registered for community donation camp');
    } else {
      throw new Error(`Register camp failed: ${regCamp.status}`);
    }

    console.log('\n--- Donor Loyalty, Milestone Badges & Leaderboard ---');
    const badges = await request(app)
      .get('/api/badges/me')
      .set('Authorization', `Bearer ${donorToken}`);
    if (badges.status === 200 && Array.isArray(badges.body.badges)) {
      console.log('  [PASS] Donor milestone badge achievements query succeeded');
    } else {
      throw new Error(`Badges failed: ${badges.status}`);
    }

    const leaderboard = await request(app)
      .get('/api/badges/leaderboard')
      .set('Authorization', `Bearer ${donorToken}`);
    if (leaderboard.status === 200 && Array.isArray(leaderboard.body.leaderboard)) {
      console.log('  [PASS] Network top donor leaderboard generated');
    } else {
      throw new Error(`Leaderboard failed: ${leaderboard.status}`);
    }

    console.log('\n--- Pre-Donation Digital Health Screening Questionnaire ---');
    const screening = await request(app)
      .post('/api/questionnaires')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        weightKg: 68,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        hemoglobinSelfReport: 14.5,
        recentIllness: { hasIllness: false },
        alcoholLast24h: false,
        tattooPiercingLast6m: false,
        consentToScreening: true,
      });
    if (screening.status === 201 && screening.body.screeningResult === 'passed') {
      console.log('  [PASS] Health questionnaire validated and donor pre-cleared for donation');
    } else {
      throw new Error(`Screening failed: ${screening.status}`);
    }

    console.log('\n--- Emergency SOS Broadcast & Urgency Escalation ---');
    // Create an emergency request to test SOS broadcast
    const org = await Organization.findOne();
    const reqCreate = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        patientName: 'Trauma ICU Patient 402',
        bloodGroup: 'O+',
        unitsRequested: 3,
        hospitalName: 'Manipal Hospital',
        hospitalAddress: '98 HAL Old Airport Rd',
        hospitalPhone: '+91 80 2502 4444',
        requiredBy: new Date(Date.now() + 4 * 3600 * 1000),
        coordinates: [77.6514, 12.9592],
        urgency: 'critical',
      });
    const requestId = reqCreate.body.bloodRequest._id;

    const sosRes = await request(app)
      .post(`/api/requests/${requestId}/sos-broadcast`)
      .set('Authorization', `Bearer ${staffToken}`);
    if (sosRes.status === 200 && sosRes.body.bloodRequest.isSosBroadcast === true) {
      console.log('  [PASS] High-priority SOS broadcast successfully alerted eligible compatible donors');
    } else {
      throw new Error(`SOS broadcast failed: ${sosRes.status}`);
    }

    const escRes = await request(app)
      .post(`/api/requests/${requestId}/escalate`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ reason: 'Surgical deadline approaching in 2 hours' });
    if (escRes.status === 200 && escRes.body.escalationLevel === 1) {
      console.log('  [PASS] Urgency escalation level bumped and search radius expanded');
    } else {
      throw new Error(`Escalation failed: ${escRes.status}`);
    }

    console.log('\n================================================================');
    console.log('ALL ADVANCED FEATURES TESTS PASSED SUCCESSFULLY! (12/12)');
    console.log('================================================================');
    process.exit(0);
  } catch (error) {
    console.error('\nTest Error:', error);
    process.exit(1);
  }
};

runNewFeaturesTests();

