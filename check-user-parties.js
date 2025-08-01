require('dotenv').config();
const mongoose = require('mongoose');
const NewParty = require('./src/models/NewParty.js');

async function checkUserParties() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get test user ID
    const userId = '688cefb80d4969a599a12d64'; // test@example.com user ID
    console.log('Checking parties for user ID:', userId);

    const parties = await NewParty.find({ userId: userId });
    console.log('Total parties for user:', parties.length);
    
    if (parties.length > 0) {
      console.log('Parties:', parties.map(p => ({
        srNo: p.srNo,
        partyName: p.partyName,
        status: p.status,
        userId: p.userId
      })));
    } else {
      console.log('No parties found for this user');
    }

    // Check all parties in database
    const allParties = await NewParty.find({});
    console.log('\nAll parties in database:', allParties.length);
    console.log('All parties:', allParties.map(p => ({
      srNo: p.srNo,
      partyName: p.partyName,
      status: p.status,
      userId: p.userId
    })));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkUserParties(); 