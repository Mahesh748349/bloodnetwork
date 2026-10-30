const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const BloodInventory = require('../models/BloodInventory');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function importRealDataset() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blood_donation_db';
  await mongoose.connect(uri);
  console.log('[Dataset Importer] Connected to MongoDB...');

  const dataPath = path.join(__dirname, '../../data/real_blood_banks_india.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`Dataset not found at ${dataPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const hospitals = JSON.parse(rawData);

  console.log(`[Dataset Importer] Importing ${hospitals.length} authentic hospital & blood bank facilities...`);

  let importedCount = 0;
  for (const item of hospitals) {
    const org = await Organization.findOneAndUpdate(
      { name: item.name },
      {
        name: item.name,
        organizationType: item.organizationType,
        registrationIdentifier: item.registrationIdentifier,
        address: item.address,
        location: item.location,
        contactInformation: item.contactInformation,
        status: item.status || 'active',
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Seed baseline inventory units for this facility
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    for (const bg of bloodGroups) {
      const existing = await BloodInventory.findOne({
        organizationId: org._id,
        bloodGroup: bg,
        componentType: 'whole_blood',
      });
      if (!existing) {
        await BloodInventory.create({
          organizationId: org._id,
          bloodGroup: bg,
          componentType: 'whole_blood',
          unitsAvailable: Math.floor(Math.random() * 12) + 2, // 2 to 14 units
          storageLocation: 'Cold Storage Room 1',
          expiryDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          status: 'available',
        });
      }
    }

    importedCount++;
  }

  console.log(`[Dataset Importer] Successfully linked and synced ${importedCount} real-world hospital/blood bank facilities!`);
  process.exit(0);
}

importRealDataset().catch((err) => {
  console.error('[Dataset Importer Error]', err);
  process.exit(1);
});
