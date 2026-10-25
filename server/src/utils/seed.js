const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const BloodRequest = require('../models/BloodRequest');
const DonorResponse = require('../models/DonorResponse');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

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
    console.log('[Seeder] Cleared previous records.');

    // 1. Create Blood Bank Administrator
    const adminUser = await User.create({
      name: 'Dr. Evelyn Reed (Blood Bank Admin)',
      email: 'admin@bloodnetwork.org',
      password: 'admin123',
      phone: '+91 98765 43210',
      role: 'admin',
      status: 'active',
    });

    // 2. Create Requesters (Doctors / Hospital Coordinators)
    const requester1 = await User.create({
      name: 'Dr. Rajesh Sharma (City Care Trauma)',
      email: 'dr.sharma@citycare.org',
      password: 'requester123',
      phone: '+91 91234 56789',
      role: 'requester',
      status: 'active',
    });

    const requester2 = await User.create({
      name: 'Nurse Sarah Jenkins (Metro Emergency)',
      email: 'sarah.requester@metrohealth.org',
      password: 'requester123',
      phone: '+91 92345 67890',
      role: 'requester',
      status: 'active',
    });

    // 3. Create Donors with realistic GeoJSON coordinates around Bangalore, India
    // (Bangalore center ~ 77.5946, 12.9716)
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
        name: 'Vikram Singh',
        email: 'vikram.singh@example.com',
        phone: '+91 98450 66778',
        bloodGroup: 'A-',
        coordinates: [77.5703, 13.0031], // Malleshwaram
        city: 'Malleshwaram',
        state: 'Karnataka',
        available: false, // Currently unavailable
        verified: 'verified',
        donations: 2,
        lastDonation: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
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
      {
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@example.com',
        phone: '+91 98450 88990',
        bloodGroup: 'O+',
        coordinates: [77.6762, 12.8452], // Electronic City
        city: 'Electronic City',
        state: 'Karnataka',
        available: true,
        verified: 'pending', // Pending verification
        donations: 1,
        lastDonation: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      },
      {
        name: 'Pooja Hegde',
        email: 'pooja.hegde@example.com',
        phone: '+91 98450 99001',
        bloodGroup: 'AB-',
        coordinates: [77.5534, 12.9912], // Rajajinagar
        city: 'Rajajinagar',
        state: 'Karnataka',
        available: true,
        verified: 'verified',
        donations: 3,
        lastDonation: new Date(Date.now() - 140 * 24 * 60 * 60 * 1000),
      },
      {
        name: 'Karthik Reddy',
        email: 'karthik.reddy@example.com',
        phone: '+91 98451 00112',
        bloodGroup: 'O-',
        coordinates: [77.5971, 13.0358], // Hebbal
        city: 'Hebbal',
        state: 'Karnataka',
        available: true,
        verified: 'verified',
        donations: 4,
        lastDonation: new Date(Date.now() - 105 * 24 * 60 * 60 * 1000),
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
        lastAvailabilityUpdate: new Date(),
        verificationStatus: d.verified,
        medicalReviewNotes:
          d.verified === 'verified'
            ? 'Clinically screened. Hemoglobin levels and vital parameters within normal ranges.'
            : 'Awaiting lab screening verification.',
        verifiedBy: d.verified === 'verified' ? adminUser._id : null,
        verifiedAt: d.verified === 'verified' ? new Date() : null,
        totalDonationsCompleted: d.donations,
        lastDonationDate: d.lastDonation,
      });

      createdDonors.push({ user, profile });
    }

    console.log(`[Seeder] Created 1 Admin, 2 Requesters, and ${createdDonors.length} Donors.`);

    // 4. Create realistic Emergency Blood Requests
    // Request 1: Urgent O+ at Manipal Hospital Old Airport Rd
    const request1 = await BloodRequest.create({
      requester: requester1._id,
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
      requiredBy: new Date(Date.now() + 6 * 60 * 60 * 1000), // In 6 hours
      description: 'Emergency blood needed for emergency surgery following multiple trauma injuries. OT scheduled.',
      status: 'donors_contacted',
      matchedDonorsCount: 4,
      contactedDonorsCount: 2,
      acceptedDonorsCount: 1,
    });

    // Request 2: Critical A+ at Apollo Hospitals Bannerghatta Rd
    const request2 = await BloodRequest.create({
      requester: requester2._id,
      patientName: 'Meera Sengupta (Cardiac Surgery)',
      bloodGroup: 'A+',
      unitsRequested: 2,
      hospital: {
        name: 'Apollo Hospitals Bannerghatta',
        address: '154/11 Bannerghatta Main Rd, Bangalore',
        contactPhone: '+91 80 2630 4050',
        location: {
          type: 'Point',
          coordinates: [77.5993, 12.8938],
        },
      },
      urgency: 'high',
      requiredBy: new Date(Date.now() + 18 * 60 * 60 * 1000), // In 18 hours
      description: 'Urgent bypass surgery scheduled. Patient blood group is A positive. Need whole blood or PRBC.',
      status: 'awaiting_responses',
      matchedDonorsCount: 3,
      contactedDonorsCount: 2,
      acceptedDonorsCount: 1,
    });

    // Request 3: Open B+ request at Fortis Hospital Cunningham Rd
    const request3 = await BloodRequest.create({
      requester: requester1._id,
      patientName: 'Sunil Rao (Dengue Platelets/PRBC)',
      bloodGroup: 'B+',
      unitsRequested: 2,
      hospital: {
        name: 'Fortis Hospital',
        address: '14 Cunningham Rd, Vasanth Nagar, Bangalore',
        contactPhone: '+91 80 4199 4444',
        location: {
          type: 'Point',
          coordinates: [77.5987, 12.9866],
        },
      },
      urgency: 'high',
      requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000),
      description: 'Platelet count critically low (sub 20k). Urgent transfusion needed.',
      status: 'open',
      matchedDonorsCount: 2,
      contactedDonorsCount: 0,
      acceptedDonorsCount: 0,
    });

    // Request 4: Fulfilled O- request at Victoria Hospital
    const request4 = await BloodRequest.create({
      requester: requester2._id,
      patientName: 'Baby Aarav (Pediatric Emergency)',
      bloodGroup: 'O-',
      unitsRequested: 1,
      hospital: {
        name: 'Victoria Hospital',
        address: 'Near City Market, Fort Road, Bangalore',
        contactPhone: '+91 80 2670 1150',
        location: {
          type: 'Point',
          coordinates: [77.5739, 12.9625],
        },
      },
      urgency: 'critical',
      requiredBy: new Date(Date.now() - 12 * 60 * 60 * 1000),
      description: 'Rare O negative pediatric emergency case.',
      status: 'fulfilled',
      matchedDonorsCount: 2,
      contactedDonorsCount: 2,
      acceptedDonorsCount: 1,
      closureNotes: 'Successfully donated by Sneha Rao and verified by Blood Bank coordinator.',
      fulfilledAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    });

    // 5. Create Donor Responses
    // Rahul Verma accepted Request 1
    const rahul = createdDonors.find((d) => d.user.email === 'rahul.verma@example.com');
    if (rahul) {
      await DonorResponse.create({
        bloodRequest: request1._id,
        donor: rahul.user._id,
        donorProfile: rahul.profile._id,
        responseStatus: 'accepted',
        donorNotes: 'I am on my way to Manipal Hospital, can arrive in 25 minutes.',
        respondedAt: new Date(Date.now() - 45 * 60 * 1000),
      });
    }

    // Priya Nair accepted Request 2
    const priya = createdDonors.find((d) => d.user.email === 'priya.nair@example.com');
    if (priya) {
      await DonorResponse.create({
        bloodRequest: request2._id,
        donor: priya.user._id,
        donorProfile: priya.profile._id,
        responseStatus: 'accepted',
        donorNotes: 'Available tomorrow morning before 10 AM.',
        respondedAt: new Date(Date.now() - 30 * 60 * 1000),
      });
    }

    // Sneha Rao fulfilled Request 4
    const sneha = createdDonors.find((d) => d.user.email === 'sneha.rao@example.com');
    if (sneha) {
      await DonorResponse.create({
        bloodRequest: request4._id,
        donor: sneha.user._id,
        donorProfile: sneha.profile._id,
        responseStatus: 'accepted',
        donorNotes: 'Donation completed at Victoria Hospital blood bank.',
        respondedAt: new Date(Date.now() - 11 * 60 * 60 * 1000),
      });
    }

    // 6. Create Notifications
    await Notification.create({
      recipient: rahul.user._id,
      bloodRequest: request1._id,
      title: 'Urgent Blood Donation Request: O+',
      message: 'Manipal Hospital urgently requires 3 units of O+ blood. Can you assist?',
      type: 'contact_invite',
      channel: 'both',
      deliveryStatus: 'delivered',
      isRead: true,
      readAt: new Date(Date.now() - 40 * 60 * 1000),
    });

    await Notification.create({
      recipient: requester1._id,
      bloodRequest: request1._id,
      title: 'Donor Accepted Request: O+',
      message: 'Rahul Verma has accepted your blood request for Manipal Hospital.',
      type: 'donor_accepted',
      channel: 'both',
      deliveryStatus: 'delivered',
      isRead: false,
    });

    // 7. Create Audit Logs
    await AuditLog.create({
      actor: adminUser._id,
      action: 'VERIFY_DONOR',
      recordModel: 'DonorProfile',
      recordId: rahul.profile._id,
      details: { verificationStatus: 'verified', notes: 'Screened donor eligibility verified.' },
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    await AuditLog.create({
      actor: adminUser._id,
      action: 'FULFILL_REQUEST',
      recordModel: 'BloodRequest',
      recordId: request4._id,
      details: { unitsFulfillled: 1, donor: 'Sneha Rao', hospital: 'Victoria Hospital' },
      timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000),
    });

    console.log('[Seeder] Synthetic seed data inserted successfully!');
    console.log('====================================================');
    console.log('DEMO ACCOUNTS FOR LOGIN:');
    console.log('1. Admin:     admin@bloodnetwork.org     / admin123');
    console.log('2. Requester: dr.sharma@citycare.org     / requester123');
    console.log('3. Requester: sarah.requester@metrohealth.org / requester123');
    console.log('4. Donor (O+): rahul.verma@example.com   / donor123');
    console.log('5. Donor (A+): priya.nair@example.com    / donor123');
    console.log('6. Donor (O-): sneha.rao@example.com     / donor123');
    console.log('====================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error]', error);
    process.exit(1);
  }
};

seedData();
