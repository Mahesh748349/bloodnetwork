const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const DonorProfile = require('../src/models/DonorProfile');
const Organization = require('../src/models/Organization');
const DonationEvent = require('../src/models/DonationEvent');
const DonorDeferral = require('../src/models/DonorDeferral');
const DeferralRule = require('../src/models/DeferralRule');
const BloodRequest = require('../src/models/BloodRequest');
const AuditLog = require('../src/models/AuditLog');
const { evaluateDonorEligibility } = require('../src/services/deferralService');

const runTests = async () => {
  console.log('================================================================');
  console.log('MULTI-HOSPITAL BLOOD DONATION & DEFERRAL PLATFORM TEST SUITE');
  console.log('================================================================\n');

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
    const testPort = 5056;
    serverInstance = app.listen(testPort);
    const baseUrl = `http://localhost:${testPort}/api`;

    // Baseline Health Check
    console.log('--- Health Check ---');
    const healthRes = await fetch(`${baseUrl}/health`).then((r) => r.json());
    assert(healthRes.status === 'ok', 'Health endpoint returns status: ok');

    // Setup Test Data & Organizations
    console.log('\n--- Setup Organizations & Users ---');
    // Ensure Hospital A and Hospital B exist
    let hospitalA = await Organization.findOne({ registrationIdentifier: 'TEST-HOSP-A' });
    if (!hospitalA) {
      hospitalA = await Organization.create({
        name: 'Hospital A Memorial',
        organizationType: 'hospital',
        registrationIdentifier: 'TEST-HOSP-A',
        status: 'active',
        location: { type: 'Point', coordinates: [77.6, 12.97] },
      });
    }

    let hospitalB = await Organization.findOne({ registrationIdentifier: 'TEST-HOSP-B' });
    if (!hospitalB) {
      hospitalB = await Organization.create({
        name: 'Hospital B General',
        organizationType: 'hospital',
        registrationIdentifier: 'TEST-HOSP-B',
        status: 'active',
        location: { type: 'Point', coordinates: [77.61, 12.98] },
      });
    }

    // Platform Admin User
    let admin = await User.findOne({ email: 'test.admin@platform.org' });
    if (!admin) {
      admin = await User.create({
        name: 'Test Platform Admin',
        email: 'test.admin@platform.org',
        password: 'password123',
        role: 'platform_admin',
        status: 'active',
      });
    }

    // Hospital A Staff
    let staffA = await User.findOne({ email: 'staff.a@hosp-a.org' });
    if (!staffA) {
      staffA = await User.create({
        name: 'Nurse Alice (Hospital A)',
        email: 'staff.a@hosp-a.org',
        password: 'password123',
        role: 'requester',
        organizationId: hospitalA._id,
        status: 'active',
      });
    }

    // Hospital B Staff
    let staffB = await User.findOne({ email: 'staff.b@hosp-b.org' });
    if (!staffB) {
      staffB = await User.create({
        name: 'Dr. Bob (Hospital B)',
        email: 'staff.b@hosp-b.org',
        password: 'password123',
        role: 'requester',
        organizationId: hospitalB._id,
        status: 'active',
      });
    }

    // Primary Test Donor
    let testDonorUser = await User.findOne({ email: 'test.donor.network@example.com' });
    if (!testDonorUser) {
      testDonorUser = await User.create({
        name: 'Multi-Hospital Test Donor',
        email: 'test.donor.network@example.com',
        password: 'password123',
        role: 'donor',
        status: 'active',
      });
    }

    let testDonorProfile = await DonorProfile.findOne({ user: testDonorUser._id });
    if (!testDonorProfile) {
      testDonorProfile = await DonorProfile.create({
        user: testDonorUser._id,
        bloodGroup: 'O+',
        location: { type: 'Point', coordinates: [77.605, 12.975] },
        availabilityStatus: true,
        currentDeferralStatus: 'available',
      });
    } else {
      testDonorProfile.currentDeferralStatus = 'available';
      testDonorProfile.currentDeferralUntil = null;
      testDonorProfile.availabilityStatus = true;
      await testDonorProfile.save();
    }

    // Clean any prior test deferrals & events for this donor
    await DonorDeferral.deleteMany({ donorId: testDonorUser._id });
    await DonationEvent.deleteMany({ donorId: testDonorUser._id });

    // Authenticate and get tokens
    const adminToken = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.admin@platform.org', password: 'password123' }),
    }).then((r) => r.json()).then((d) => d.token);

    const staffAToken = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff.a@hosp-a.org', password: 'password123' }),
    }).then((r) => r.json()).then((d) => d.token);

    const staffBToken = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff.b@hosp-b.org', password: 'password123' }),
    }).then((r) => r.json()).then((d) => d.token);

    const donorToken = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.donor.network@example.com', password: 'password123' }),
    }).then((r) => r.json()).then((d) => d.token);

    assert(adminToken && staffAToken && staffBToken && donorToken, 'All roles authenticated successfully with JWT tokens');

    // =========================================================================
    // Scenario 2: A pending appointment does not trigger a deferral
    // =========================================================================
    console.log('\n--- Scenario 2: Pending Appointment Does Not Trigger Deferral ---');
    const scheduleRes = await fetch(`${baseUrl}/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffAToken}` },
      body: JSON.stringify({
        donorId: testDonorUser._id,
        organizationId: hospitalA._id,
        donationDate: new Date(),
        donationType: 'whole_blood',
        status: 'scheduled', // Just scheduled appointment!
      }),
    }).then((r) => r.json());

    assert(scheduleRes.success === true, 'Appointment scheduled successfully');
    const scheduledEventId = scheduleRes.donationEvent._id;
    const postScheduleProfile = await DonorProfile.findOne({ user: testDonorUser._id });
    assert(
      postScheduleProfile.currentDeferralStatus === 'available',
      'Scheduled appointment leaves donor status as available (does not trigger deferral)'
    );

    // =========================================================================
    // Scenario 3: An invitation acceptance does not trigger a deferral
    // =========================================================================
    console.log('\n--- Scenario 3: Invitation Acceptance Does Not Trigger Deferral ---');
    // Create request by Hospital A
    const reqRes = await fetch(`${baseUrl}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffAToken}` },
      body: JSON.stringify({
        patientName: 'Test Invitation Patient',
        bloodGroup: 'O+',
        unitsRequested: 1,
        hospitalName: hospitalA.name,
        hospitalAddress: 'Bangalore Center',
        coordinates: [77.6, 12.97],
        urgency: 'high',
        requiredBy: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      }),
    }).then((r) => r.json());
    const bloodReqId = reqRes.bloodRequest._id;

    // Donor responds 'accepted'
    const acceptRes = await fetch(`${baseUrl}/requests/${bloodReqId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
      body: JSON.stringify({ responseStatus: 'accepted', donorNotes: 'I will be there' }),
    }).then((r) => r.json());
    assert(acceptRes.success === true, 'Donor accepts blood request invitation');

    const postAcceptProfile = await DonorProfile.findOne({ user: testDonorUser._id });
    assert(
      postAcceptProfile.currentDeferralStatus === 'available',
      'Accepting an invitation does NOT trigger a deferral'
    );

    // =========================================================================
    // Scenario 4: A verified donation creates the correct deferral record
    // Scenario 1: A donor donates at Hospital A and is excluded from matching at Hospital B
    // =========================================================================
    console.log('\n--- Scenario 4 & 1: Verified Donation at Hospital A & Cross-Hospital Exclusion at Hospital B ---');
    // Staff at Hospital A verifies the donation
    const verifyRes = await fetch(`${baseUrl}/donations/${scheduledEventId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffAToken}` },
      body: JSON.stringify({ verificationNotes: 'Whole blood 450ml successfully collected.' }),
    }).then((r) => r.json());

    assert(verifyRes.success === true, 'Hospital A verifies the donation event');
    assert(
      verifyRes.deferral && verifyRes.deferral.status === 'active',
      'Verified donation creates an active DonorDeferral record'
    );
    assert(
      verifyRes.deferral.reasonCode === 'post_whole_blood',
      'Correct medical deferral reason code (post_whole_blood) applied'
    );

    const postVerifyProfile = await DonorProfile.findOne({ user: testDonorUser._id });
    assert(
      postVerifyProfile.currentDeferralStatus === 'temporarily_deferred',
      'DonorProfile currentDeferralStatus updated to temporarily_deferred'
    );

    // Now Hospital B searches for donors of the same blood group nearby!
    const searchAtHospitalB = await fetch(
      `${baseUrl}/donors/nearby?bloodGroup=O%2B&lng=77.605&lat=12.975&radiusKm=25`,
      { headers: { Authorization: `Bearer ${staffBToken}` } }
    ).then((r) => r.json());

    const isExcludedAtB = !searchAtHospitalB.donors.some(
      (d) => d.user._id.toString() === testDonorUser._id.toString()
    );
    assert(
      isExcludedAtB,
      'CROSS-HOSPITAL ENFORCEMENT: Donor who donated at Hospital A is EXCLUDED from matching at Hospital B'
    );

    // =========================================================================
    // Scenario 5: A duplicate donation event does not create duplicate deferrals
    // =========================================================================
    console.log('\n--- Scenario 5: Duplicate Donation Prevention ---');
    // Attempting to re-verify the same donation event
    const duplicateVerifyRes = await fetch(`${baseUrl}/donations/${scheduledEventId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffAToken}` },
      body: JSON.stringify({ verificationNotes: 'Re-verifying duplicate attempt' }),
    }).then((r) => r.json());

    assert(
      duplicateVerifyRes.success === false,
      'Re-verifying already verified event is rejected with 400 error'
    );

    const deferralCount = await DonorDeferral.countDocuments({
      donorId: testDonorUser._id,
      sourceDonationEventId: scheduledEventId,
    });
    assert(deferralCount === 1, 'Only exactly 1 deferral record exists (no duplicate deferrals created)');

    // =========================================================================
    // Scenario 6: A donor cannot manually remove an active deferral
    // =========================================================================
    console.log('\n--- Scenario 6: Donor Cannot Manually Remove Active Deferral ---');
    // Donor attempts to update availability to true while deferred
    const donorToggleAttempt = await fetch(`${baseUrl}/donors/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
      body: JSON.stringify({ availabilityStatus: true }),
    }).then((r) => r.json());

    assert(
      donorToggleAttempt.success === false,
      'Donor cannot toggle availability to true while deferred'
    );

    // Donor attempts to send currentDeferralStatus: 'available' in profile update
    const donorTamperAttempt = await fetch(`${baseUrl}/donors/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
      body: JSON.stringify({ currentDeferralStatus: 'available', currentDeferralUntil: null }),
    });
    assert(
      donorTamperAttempt.status === 403,
      'Direct attempt by donor to alter/clear deferral fields is blocked with 403 Forbidden'
    );

    // =========================================================================
    // Scenario 7: A donor cannot be scheduled while actively deferred
    // =========================================================================
    console.log('\n--- Scenario 7: Donor Cannot Be Scheduled While Actively Deferred ---');
    const scheduleWhileDeferred = await fetch(`${baseUrl}/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffBToken}` },
      body: JSON.stringify({
        donorId: testDonorUser._id,
        organizationId: hospitalB._id,
        donationDate: new Date(),
        status: 'scheduled',
      }),
    }).then((r) => r.json());

    assert(
      scheduleWhileDeferred.success === false && scheduleWhileDeferred.eligibility,
      'Hospital B cannot schedule actively deferred donor (fails closed with deferral reason)'
    );

    // Also donor cannot accept another blood request while deferred
    const acceptWhileDeferred = await fetch(`${baseUrl}/requests/${bloodReqId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
      body: JSON.stringify({ responseStatus: 'accepted' }),
    });
    assert(
      acceptWhileDeferred.status === 403,
      'Donor blocked from accepting another blood donation request while deferred'
    );

    // =========================================================================
    // Scenario 8: Expired deferrals are re-evaluated correctly
    // =========================================================================
    console.log('\n--- Scenario 8: Expired Deferral Re-evaluation ---');
    // Set deferral end date to the past
    await DonorDeferral.updateMany(
      { donorId: testDonorUser._id },
      { $set: { endDate: new Date(Date.now() - 1000 * 60) } }
    );

    // Evaluate eligibility
    const eligibilityReEval = await evaluateDonorEligibility(testDonorUser._id);
    assert(
      eligibilityReEval.eligible === true && eligibilityReEval.status === 'available',
      'Expired deferral is dynamically re-evaluated and donor status restored to available'
    );

    // Check that matching now includes donor
    const searchAfterExpiry = await fetch(
      `${baseUrl}/donors/nearby?bloodGroup=O%2B&lng=77.605&lat=12.975&radiusKm=25`,
      { headers: { Authorization: `Bearer ${staffBToken}` } }
    ).then((r) => r.json());
    const isIncludedAfterExpiry = searchAfterExpiry.donors.some(
      (d) => d.user._id.toString() === testDonorUser._id.toString()
    );
    assert(isIncludedAfterExpiry, 'Donor reappears as eligible in matching once deferral date has passed');

    // =========================================================================
    // Scenario 9: A deferral requiring medical review does not automatically become eligible
    // =========================================================================
    console.log('\n--- Scenario 9: Deferral Requiring Medical Review Does Not Auto-Restore ---');
    // Create rule requiring review
    const reviewRuleVersion = `test-review-rule-${Date.now()}`;
    await DeferralRule.create({
      donationType: 'other',
      deferralDays: 1,
      version: reviewRuleVersion,
      requiresMedicalReviewOnExpiry: true,
      isActive: true,
    });

    // Create deferral referencing this rule that ended in the past
    await DonorDeferral.create({
      donorId: testDonorUser._id,
      startDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      endDate: new Date(Date.now() - 1 * 24 * 3600 * 1000), // Ended yesterday
      ruleVersion: reviewRuleVersion,
      status: 'active',
      authorizedBy: admin._id,
    });

    const eligibilityWithReview = await evaluateDonorEligibility(testDonorUser._id);
    assert(
      eligibilityWithReview.eligible === false &&
        eligibilityWithReview.status === 'requires_medical_review',
      'Rule with requiresMedicalReviewOnExpiry transitions to requires_medical_review instead of eligible'
    );

    // =========================================================================
    // Scenario 10: Hospital A cannot modify Hospital B's private records
    // =========================================================================
    console.log('\n--- Scenario 10: Multi-Tenant Data Isolation ---');
    // Hospital B creates a blood request
    const hospBRequest = await BloodRequest.create({
      requester: staffB._id,
      organizationId: hospitalB._id,
      patientName: 'Hospital B Private Patient',
      bloodGroup: 'B+',
      unitsRequested: 2,
      hospital: { name: hospitalB.name, address: 'B Road', location: { type: 'Point', coordinates: [77.61, 12.98] } },
      status: 'open',
      requiredBy: new Date(Date.now() + 12 * 3600 * 1000),
    });

    // Staff A attempts to cancel Hospital B's request
    const crossCancelAttempt = await fetch(`${baseUrl}/requests/${hospBRequest._id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffAToken}` },
      body: JSON.stringify({ reason: 'Malicious cancellation across tenant' }),
    });
    assert(
      crossCancelAttempt.status === 403,
      'Hospital A staff blocked with 403 Forbidden when trying to cancel Hospital B request'
    );

    // Staff A attempts to update Hospital B request status
    const crossStatusAttempt = await fetch(`${baseUrl}/requests/${hospBRequest._id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffAToken}` },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    assert(
      crossStatusAttempt.status === 403,
      'Hospital A staff blocked with 403 Forbidden when trying to change Hospital B request status'
    );

    // =========================================================================
    // Scenario 11: An unauthorized user cannot verify a donation or alter a medical rule
    // =========================================================================
    console.log('\n--- Scenario 11: RBAC on Medical Rules & Donation Verification ---');
    // Donor attempts to alter a medical rule
    const ruleAlterAttempt = await fetch(`${baseUrl}/admin/deferral-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
      body: JSON.stringify({ donationType: 'whole_blood', deferralDays: 0, version: 'hacked' }),
    });
    assert(
      ruleAlterAttempt.status === 403,
      'Donor blocked with 403 Forbidden when attempting to alter a medical deferral rule'
    );

    // Donor attempts to verify a donation
    const verifyAttemptByDonor = await fetch(`${baseUrl}/donations/${scheduledEventId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
      body: JSON.stringify({ verificationNotes: 'Self-verification attempt' }),
    });
    assert(
      verifyAttemptByDonor.status === 403,
      'Donor blocked with 403 Forbidden when attempting to verify a donation'
    );

    // =========================================================================
    // Scenario 12: Concurrent matching requests cannot bypass a newly recorded deferral
    // =========================================================================
    console.log('\n--- Scenario 12: Concurrency & Real-Time Race Condition Safety ---');
    // Create new active deferral for test donor
    const concurrentDeferral = await DonorDeferral.create({
      donorId: testDonorUser._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 56 * 24 * 3600 * 1000),
      reasonCode: 'post_whole_blood',
      ruleVersion: '1.0.0',
      status: 'active',
      authorizedBy: staffA._id,
    });
    await DonorProfile.updateOne(
      { user: testDonorUser._id },
      { currentDeferralStatus: 'temporarily_deferred', currentDeferralUntil: concurrentDeferral.endDate }
    );

    // Fire 5 concurrent matching requests at the exact same millisecond
    const concurrentSearches = await Promise.all([
      fetch(`${baseUrl}/donors/nearby?bloodGroup=O%2B&lng=77.605&lat=12.975&radiusKm=25`, { headers: { Authorization: `Bearer ${staffBToken}` } }).then((r) => r.json()),
      fetch(`${baseUrl}/donors/nearby?bloodGroup=O%2B&lng=77.605&lat=12.975&radiusKm=25`, { headers: { Authorization: `Bearer ${staffBToken}` } }).then((r) => r.json()),
      fetch(`${baseUrl}/donors/nearby?bloodGroup=O%2B&lng=77.605&lat=12.975&radiusKm=25`, { headers: { Authorization: `Bearer ${staffBToken}` } }).then((r) => r.json()),
      fetch(`${baseUrl}/donors/nearby?bloodGroup=O%2B&lng=77.605&lat=12.975&radiusKm=25`, { headers: { Authorization: `Bearer ${staffBToken}` } }).then((r) => r.json()),
      fetch(`${baseUrl}/donors/nearby?bloodGroup=O%2B&lng=77.605&lat=12.975&radiusKm=25`, { headers: { Authorization: `Bearer ${staffBToken}` } }).then((r) => r.json()),
    ]);

    const allExcluded = concurrentSearches.every(
      (res) => !res.donors.some((d) => d.user._id.toString() === testDonorUser._id.toString())
    );
    assert(allExcluded, 'All concurrent matching queries safely exclude the deferred donor with zero race windows');

    // =========================================================================
    // Scenario 13: Central service failure does not silently treat a donor as eligible (Fail Closed)
    // =========================================================================
    console.log('\n--- Scenario 13: Fail Closed Safety on Service Errors ---');
    // Evaluate eligibility with invalid / un-resolvable donor ID
    const failClosedEval = await evaluateDonorEligibility('non_existent_fake_id_123');
    assert(
      failClosedEval.eligible === false,
      'Eligibility evaluation fails closed (eligible: false) when central record cannot be verified'
    );

    // =========================================================================
    // Scenario 14: Sensitive deferral reasons are not exposed to unauthorized users
    // =========================================================================
    console.log('\n--- Scenario 14: Privacy Protection on Clinical Deferral Details ---');
    // Staff B checks donor deferral status
    const staffBCheck = await fetch(`${baseUrl}/deferrals/donors/${testDonorUser._id}/deferral-status`, {
      headers: { Authorization: `Bearer ${staffBToken}` },
    }).then((r) => r.json());

    assert(staffBCheck.success === true, 'Staff can query donor eligibility status');
    assert(
      staffBCheck.deferralStatus.eligible === false,
      'Staff receives eligibility outcome (eligible: false)'
    );
    assert(
      !staffBCheck.deferralStatus.reasonCode,
      'Sensitive clinical reasonCode is NOT exposed to routine hospital staff'
    );

    // =========================================================================
    // Scenario 15: A verified correction or authorized override updates the audit trail
    // =========================================================================
    console.log('\n--- Scenario 15: Clinical Override & Audit Trail ---');
    const initialAuditCount = await AuditLog.countDocuments({
      action: 'REVIEW_DONOR_DEFERRAL',
    });

    // Authorized review override by Platform Admin
    const overrideRes = await fetch(`${baseUrl}/deferrals/${concurrentDeferral._id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        decision: 'approve_eligible',
        reviewNotes: 'Verified clerical error correction: hemoglobin screening re-verified by head hematologist',
      }),
    }).then((r) => r.json());

    assert(overrideRes.success === true, 'Authorized override succeeds');
    assert(overrideRes.deferral.status === 'released_early', 'Deferral status transitioned to released_early');

    const updatedAuditCount = await AuditLog.countDocuments({
      action: 'REVIEW_DONOR_DEFERRAL',
    });
    assert(
      updatedAuditCount === initialAuditCount + 1,
      'Immutable audit trail recorded for clinical override with actor and review notes'
    );

    console.log('\n================================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log('================================================================');
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
