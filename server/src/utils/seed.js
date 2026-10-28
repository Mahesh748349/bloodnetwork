const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const BloodRequest = require('../models/BloodRequest');
const DonorResponse = require('../models/DonorResponse');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const Organization = require('../models/Organization');
const DonationEvent = require('../models/DonationEvent');
const DonorDeferral = require('../models/DonorDeferral');
const DeferralRule = require('../models/DeferralRule');
const { ensureDefaultRules } = require('../services/deferralService');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blood_donation_db';
    await mongoose.connect(mongoUri);
    console.log('[Seeder] Connected to MongoDB...');

    // Clear existing collections
    await User.deleteMany({});
    await DonorProfile.deleteMany({});
    await BloodRequest.deleteMany({});
    await DonorResponse.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});
    await Organization.deleteMany({});
    await DonationEvent.deleteMany({});
    await DonorDeferral.deleteMany({});
    await DeferralRule.deleteMany({});
    console.log('[Seeder] Cleared previous records.');

    // 1. Create Default Versioned Deferral Rules
    await ensureDefaultRules();
    console.log('[Seeder] Initialized Medical Deferral Rules (v1.0.0).');

    // 2. Create Platform Administrator
    const adminUser = await User.create({
      name: 'Dr. Evelyn Reed (Platform Admin)',
      email: 'admin@bloodnetwork.org',
      password: 'admin123',
      phone: '+91 98765 43210',
      role: 'admin',
      status: 'active',
    });

    // 3. Create Participating Hospital Organizations
    const org1 = await Organization.create({
      name: 'Manipal Hospital (Old Airport Road)',
      organizationType: 'hospital',
      registrationIdentifier: 'HOSP-MANIPAL-01',
      address: {
        street: '98 HAL Old Airport Rd, Kodihalli',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560017',
        formattedAddress: '98 HAL Old Airport Rd, Kodihalli, Bangalore, Karnataka',
      },
      location: {
        type: 'Point',
        coordinates: [77.6514, 12.9592],
      },
      contactInformation: {
        phone: '+91 80 2502 4444',
        email: 'bloodbank@manipalhospitals.com',
      },
      status: 'active',
      approvedBy: adminUser._id,
      approvedAt: new Date(),
    });

    const org2 = await Organization.create({
      name: 'Apollo Hospital (Bannerghatta)',
      organizationType: 'hospital',
      registrationIdentifier: 'HOSP-APOLLO-02',
      address: {
        street: '154/11 Bannerghatta Main Rd',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560076',
        formattedAddress: '154/11 Bannerghatta Main Rd, Bangalore, Karnataka',
      },
      location: {
        type: 'Point',
        coordinates: [77.5993, 12.8938],
      },
      contactInformation: {
        phone: '+91 80 2630 4050',
        email: 'emergency@apollohospitals.com',
      },
      status: 'active',
      approvedBy: adminUser._id,
      approvedAt: new Date(),
    });

    const org3 = await Organization.create({
      name: 'Victoria Hospital Blood Bank',
      organizationType: 'blood_bank',
      registrationIdentifier: 'BB-VICTORIA-03',
      address: {
        street: 'Near City Market, Fort Road',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560002',
        formattedAddress: 'Near City Market, Fort Road, Bangalore, Karnataka',
      },
      location: {
        type: 'Point',
        coordinates: [77.5739, 12.9625],
      },
      contactInformation: {
        phone: '+91 80 2670 1150',
        email: 'bloodbank@victoriahospital.gov.in',
      },
      status: 'active',
      approvedBy: adminUser._id,
      approvedAt: new Date(),
    });

    // 4. Create Requesters / Hospital Staff
    const requester1 = await User.create({
      name: 'Dr. Rajesh Sharma (Manipal Hospital)',
      email: 'dr.sharma@citycare.org',
      password: 'requester123',
      phone: '+91 91234 56789',
      role: 'requester',
      organizationId: org1._id,
      status: 'active',
    });

    const requester2 = await User.create({
      name: 'Nurse Sarah Jenkins (Apollo Hospital)',
      email: 'sarah.requester@metrohealth.org',
      password: 'requester123',
      phone: '+91 92345 67890',
      role: 'requester',
      organizationId: org2._id,
      status: 'active',
    });

    // 5. Create Donors with platform-wide identity
    const donorSeeds = [
      {
        name: 'Rahul Verma',
        email: 'rahul.verma@example.com',
        phone: '+91 98450 11223',
        bloodGroup: 'O+',
        coordinates: [77.6094, 12.9784], // Central Bangalore
        city: 'Bangalore Central',
        state: 'Karnataka',
        available: true,
        verified: 'verified',
        donations: 4,
        lastDonation: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000),
      },
      {
        name: 'Priya Nair',
        email: 'priya.nair@example.com',
        phone: '+91 98450 22334',
        bloodGroup: 'A+',
        coordinates: [77.6412, 12.9719], // Indiranagar
        city: 'Indiranagar',
        state: 'Karnataka',
        available: true,
        verified: 'verified',
        donations: 3,
        lastDonation: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      },
      {
        name: 'Amit Patel',
        email: 'amit.patel@example.com',
        phone: '+91 98450 33445',
        bloodGroup: 'B+',
        coordinates: [77.6245, 12.9352], // Koramangala
        city: 'Koramangala',
        state: 'Karnataka',
        available: true,
        verified: 'verified',
        donations: 6,
        lastDonation: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      },
      {
        name: 'Sneha Rao (Universal Donor)',
        email: 'sneha.rao@example.com',
        phone: '+91 98450 44556',
        bloodGroup: 'O-',
        coordinates: [77.5828, 12.925], // Jayanagar
        city: 'Jayanagar',
        state: 'Karnataka',
        available: true,
        verified: 'verified',
        donations: 7,
        lastDonation: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000),
      },
      {
        name: 'Ananya Sharma',
        email: 'ananya.sharma@example.com',
        phone: '+91 98450 55667',
        bloodGroup: 'AB+',
        coordinates: [77.75, 12.9698], // Whitefield
        city: 'Whitefield',
        state: 'Karnataka',
        available: true,
        verified: 'verified',
        donations: 2,
        lastDonation: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
      },
      {
        name: 'Vikram Singh (Temporarily Deferred)',
        email: 'vikram.singh@example.com',
        phone: '+91 98450 66778',
        bloodGroup: 'A-',
        coordinates: [77.5703, 13.0031], // Malleshwaram
        city: 'Malleshwaram',
        state: 'Karnataka',
        available: false, // Locked due to deferral
        verified: 'verified',
        donations: 3,
        lastDonation: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        name: 'Deepa Krishnan',
        email: 'deepa.krishnan@example.com',
        phone: '+91 98450 77889',
        bloodGroup: 'B-',
        coordinates: [77.6389, 12.9116], // HSR Layout
        city: 'HSR Layout',
        state: 'Karnataka',
        available: true,
        verified: 'verified',
        donations: 5,
        lastDonation: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      },
    ];

    const createdDonors = [];
    for (const d of donorSeeds) {
      const user = await User.create({
        name: d.name,
        email: d.email,
        password: 'donor123',
        phone: d.phone,
        role: 'donor',
        status: 'active',
      });

      const profile = await DonorProfile.create({
        user: user._id,
        bloodGroup: d.bloodGroup,
        location: {
          type: 'Point',
          coordinates: d.coordinates,
        },
        address: {
          city: d.city,
          state: d.state,
          postalCode: '560001',
          formattedAddress: `${d.city}, Bangalore, Karnataka`,
        },
        availabilityStatus: d.available,
        currentDeferralStatus: d.name.includes('Deferred') ? 'temporarily_deferred' : 'available',
        currentDeferralUntil: d.name.includes('Deferred')
          ? new Date(Date.now() + 41 * 24 * 60 * 60 * 1000)
          : null,
        lastAvailabilityUpdate: new Date(),
        verificationStatus: d.verified,
        medicalReviewNotes:
          d.verified === 'verified'
            ? 'Clinically screened. Hemoglobin levels and vital parameters compliant.'
            : 'Awaiting lab screening verification.',
        verifiedBy: d.verified === 'verified' ? adminUser._id : null,
        verifiedAt: d.verified === 'verified' ? new Date() : null,
        totalDonationsCompleted: d.donations,
        lastDonationDate: d.lastDonation,
      });

      createdDonors.push({ user, profile });
    }

    // 6. Create Verified Donation Event for Vikram Singh at Manipal Hospital (org1)
    // with active deferral that affects matching at Apollo Hospital (org2)
    const vikram = createdDonors.find((d) => d.user.email === 'vikram.singh@example.com');
    if (vikram) {
      const donationEvent = await DonationEvent.create({
        donorId: vikram.user._id,
        donorProfileId: vikram.profile._id,
        organizationId: org1._id,
        eventId: `DON-${Date.now()}-MANIPAL01`,
        donationDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        donationType: 'whole_blood',
        status: 'verified',
        deferralRuleVersion: '1.0.0',
        deferralUntil: new Date(Date.now() + 41 * 24 * 60 * 60 * 1000),
        unitsCollected: 1,
        notes: 'Whole blood donation at Manipal Hospital Old Airport Rd.',
        recordedBy: requester1._id,
        verifiedBy: requester1._id,
        verifiedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      });

      await DonorDeferral.create({
        donorId: vikram.user._id,
        donorProfileId: vikram.profile._id,
        sourceDonationEventId: donationEvent._id,
        organizationId: org1._id,
        status: 'active',
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 41 * 24 * 60 * 60 * 1000),
        reasonCode: 'post_whole_blood',
        reasonDescription: 'Standard 56-day post whole-blood red cell regeneration deferral',
        ruleVersion: '1.0.0',
        authorizedBy: requester1._id,
      });
    }

    // 7. Create Emergency Blood Requests associated with Organizations
    const request1 = await BloodRequest.create({
      requester: requester1._id,
      organizationId: org1._id,
      patientName: 'Arjun Das (Road Accident Trauma)',
      bloodGroup: 'O+',
      unitsRequested: 3,
      hospital: {
        name: 'Manipal Hospital',
        address: '98 HAL Old Airport Rd, Kodihalli, Bangalore',
        contactPhone: '+91 80 2502 4444',
        location: {
          type: 'Point',
          coordinates: [77.6514, 12.9592],
        },
      },
      urgency: 'critical',
      requiredBy: new Date(Date.now() + 6 * 60 * 60 * 1000),
      description: 'Emergency blood needed for emergency surgery following multiple trauma injuries.',
      status: 'donors_contacted',
      matchedDonorsCount: 3,
      contactedDonorsCount: 1,
      acceptedDonorsCount: 1,
    });

    const request2 = await BloodRequest.create({
      requester: requester2._id,
      organizationId: org2._id,
      patientName: 'Meera Sengupta (Cardiac Surgery)',
      bloodGroup: 'A+',
      unitsRequested: 2,
      hospital: {
        name: 'Apollo Hospital Bannerghatta',
        address: '154/11 Bannerghatta Main Rd, Bangalore',
        contactPhone: '+91 80 2630 4050',
        location: {
          type: 'Point',
          coordinates: [77.5993, 12.8938],
        },
      },
      urgency: 'high',
      requiredBy: new Date(Date.now() + 18 * 60 * 60 * 1000),
      description: 'Urgent bypass surgery scheduled. Patient blood group is A positive.',
      status: 'open',
      matchedDonorsCount: 2,
      contactedDonorsCount: 0,
      acceptedDonorsCount: 0,
    });

    console.log('[Seeder] Multi-Hospital Seed complete!');
    console.log('====================================================');
    console.log('HOSPITALS SEEDED:');
    console.log(`1. Hospital A: Manipal Hospital (ID: ${org1._id})`);
    console.log(`2. Hospital B: Apollo Hospital (ID: ${org2._id})`);
    console.log(`3. Blood Bank: Victoria Hospital (ID: ${org3._id})`);
    console.log('----------------------------------------------------');
    console.log('ACCOUNTS FOR TESTING:');
    console.log('Admin (Platform):   admin@bloodnetwork.org     / admin123');
    console.log('Hospital A Staff:   dr.sharma@citycare.org     / requester123');
    console.log('Hospital B Staff:   sarah.requester@metrohealth.org / requester123');
    console.log('Donor (Active O+):  rahul.verma@example.com    / donor123');
    console.log('Donor (Deferred):   vikram.singh@example.com   / donor123');
    console.log('====================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error]', error);
    process.exit(1);
  }
};

seedData();
