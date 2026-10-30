const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function importRealHospitals(csvFilePath) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Import] Connected to MongoDB...');

    // Read CSV file
    const rawData = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = rawData.split('\n').filter(Boolean);
    const headers = lines[0].split(',').map((h) => h.trim());

    let importedCount = 0;
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < headers.length) continue;

        const name = cols[0];
        const city = cols[1] || 'Bangalore';
        const state = cols[2] || 'Karnataka';
        const lat = parseFloat(cols[3]);
        const lng = parseFloat(cols[4]);
        const phone = cols[5] || '';

        if (!name || isNaN(lat) || isNaN(lng)) continue;

        await Organization.findOneAndUpdate(
            { name },
            {
                name,
                organizationType: 'hospital',
                address: { city, state, formattedAddress: `${name}, ${city}, ${state}` },
                location: { type: 'Point', coordinates: [lng, lat] },
                contactInformation: { phone },
                status: 'active',
            },
            { upsert: true, new: true }
        );
        importedCount++;
    }

    console.log(`[Import] Successfully imported ${importedCount} authentic hospital nodes!`);
    process.exit(0);
}