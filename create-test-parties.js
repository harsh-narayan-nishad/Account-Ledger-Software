require('dotenv').config();
const mongoose = require('mongoose');
const NewParty = require('./src/models/NewParty.js');

async function createTestParties() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const userId = '688cefb80d4969a599a12d64'; // test@example.com user ID

    // Create test parties
    const testParties = [
      {
        srNo: '001',
        partyName: 'Test Company 1',
        status: 'A',
        commiSystem: 'Take',
        balanceLimit: '10000',
        mCommission: 'No Commission',
        rate: '0',
        userId: userId
      },
      {
        srNo: '002',
        partyName: 'Test Company 2',
        status: 'A',
        commiSystem: 'Give',
        balanceLimit: '15000',
        mCommission: 'With Commission',
        rate: '5',
        userId: userId
      },
      {
        srNo: '003',
        partyName: 'Test Company 3',
        status: 'A',
        commiSystem: 'Take',
        balanceLimit: '20000',
        mCommission: 'No Commission',
        rate: '0',
        userId: userId
      }
    ];

    console.log('Creating test parties for user:', userId);

    for (const partyData of testParties) {
      const party = new NewParty(partyData);
      await party.save();
      console.log('Created party:', partyData.partyName);
    }

    console.log('All test parties created successfully!');

    // Verify parties
    const userParties = await NewParty.find({ userId: userId });
    console.log('Total parties for test user:', userParties.length);
    console.log('Parties:', userParties.map(p => ({
      srNo: p.srNo,
      partyName: p.partyName,
      status: p.status
    })));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestParties(); 