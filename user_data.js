const admin = require('firebase-admin');
const { faker } = require('@faker-js/faker');
const axios = require('axios');

// Custom data sets
const ABOUT_ME_DESCRIPTIONS = [
  "Friendly neighbor who loves helping out in the community.",
  "Always happy to lend a hand to local neighbors.",
  "Experienced in home and neighborhood assistance.",
  "Passionate about building strong neighborhood connections.",
  "Reliable and eager to help with various tasks.",
  "Community-minded individual who believes in neighbor support.",
  "Enjoy meeting new people and helping where I can.",
  "Skilled in multiple tasks and always ready to assist.",
  "Local resident committed to making our neighborhood better.",
  "Flexible and willing to help with a variety of jobs."
];

const JOB_TITLES = {
  'Package Delivery': [
    "Need help receiving a large package",
    "Assistance with package pickup",
    "Help receiving multiple deliveries",
    "Package handling for apartment complex",
    "Delivery support for busy professionals"
  ],
  'Car Buying Assistance': [
    "Need help negotiating a car purchase",
    "Car buying guidance for first-time buyers",
    "Assistance with used car inspection",
    "Help researching and comparing car models",
    "Support for selecting the right vehicle"
  ],
  'Running Errands': [
    "Grocery shopping assistance needed",
    "Help with pharmacy and medical errands",
    "Picking up dry cleaning and packages",
    "Assistance with multiple errands in one day",
    "Support for seniors with daily tasks"
  ]
};

const JOB_DESCRIPTIONS = {
  'Package Delivery': [
    "I'm expecting several large packages and need help receiving and storing them securely.",
    "Looking for someone to help receive and organize multiple deliveries while I'm at work.",
    "Need assistance with managing packages in my apartment building's receiving area.",
    "Help needed to receive and sort important shipments throughout the day.",
    "Seeking a reliable neighbor to coordinate package delivery and storage."
  ],
  'Car Buying Assistance': [
    "First-time car buyer looking for guidance through the purchasing process.",
    "Need help researching and comparing different car models that fit my budget.",
    "Seeking assistance with negotiating the price and terms of a used car purchase.",
    "Looking for someone experienced to help inspect a potential car purchase.",
    "Need support in understanding car specifications and making an informed decision."
  ],
  'Running Errands': [
    "Need help picking up groceries and essential items from local stores.",
    "Seeking assistance with multiple errands including pharmacy pickup and dry cleaning.",
    "Looking for a reliable neighbor to help with time-consuming daily tasks.",
    "Need support running errands for a family member with limited mobility.",
    "Assistance required for coordinating and completing various local errands."
  ]
};

const LOCATIONS = [
  "123 Maple Street, Oakville, CA 94123",
  "456 Pine Road, Willowbrook, CA 94456",
  "789 Cedar Lane, Rivertown, CA 94789",
  "321 Elm Avenue, Sunnyvale, CA 94321",
  "654 Birch Court, Mountain View, CA 94654",
  "987 Oak Drive, Palo Alto, CA 94987",
  "246 Redwood Street, San Jose, CA 94246",
  "135 Sycamore Boulevard, Santa Clara, CA 94135",
  "864 Laurel Way, Campbell, CA 94864",
  "579 Magnolia Place, Los Gatos, CA 94579"
];

// Initialize Firebase Admin SDK (you'll need to download a service account key)
admin.initializeApp({
  credential: admin.credential.cert(require('./service_account_key.json'))
});

const db = admin.firestore();
const auth = admin.auth();

async function generateProfilePicture() {
  try {
    const response = await axios.get('https://randomuser.me/api/');
    return response.data.results[0].picture.large;
  } catch (error) {
    console.error('Error generating profile picture:', error);
    return null;
  }
}

async function generateHelperProfiles() {
  const helpers = [];
  
  for (let i = 0; i < 10; i++) {
    const profilePicture = await generateProfilePicture();
    
    const helper = {
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      password: 'TestUser123!',
      address: LOCATIONS[i],
      aboutMe: ABOUT_ME_DESCRIPTIONS[faker.number.int({ min: 0, max: ABOUT_ME_DESCRIPTIONS.length - 1 })],
      isHelper: true,
      profileImage: profilePicture,
      jobTypes: faker.helpers.arrayElements(Object.keys(JOB_TITLES), { min: 1, max: 3 }),
      helpDescription: ABOUT_ME_DESCRIPTIONS[faker.number.int({ min: 0, max: ABOUT_ME_DESCRIPTIONS.length - 1 })],
      bankInfo: {
        accountName: faker.person.fullName(),
        accountNumber: faker.finance.accountNumber(),
        routingNumber: faker.finance.routingNumber()
      }
    };
    
    helpers.push(helper);
  }
  
  return helpers;
}

async function generateNeighborProfiles() {
  const neighbors = [];
  
  for (let i = 0; i < 10; i++) {
    const profilePicture = await generateProfilePicture();
    
    const neighbor = {
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      password: 'TestUser123!',
      address: LOCATIONS[i],
      aboutMe: ABOUT_ME_DESCRIPTIONS[faker.number.int({ min: 0, max: ABOUT_ME_DESCRIPTIONS.length - 1 })],
      isHelper: false,
      profileImage: profilePicture
    };
    
    neighbors.push(neighbor);
  }
  
  return neighbors;
}

function generateJobPostings(neighborIds) {
  const jobs = [];
  
  neighborIds.forEach(neighborId => {
    // Create 1-3 jobs per neighbor
    const jobCount = faker.number.int({ min: 1, max: 3 });
    
    for (let i = 0; i < jobCount; i++) {
      const jobType = faker.helpers.arrayElement(Object.keys(JOB_TITLES));
      const paymentType = faker.helpers.arrayElement(['fixed', 'tip', 'free']);
      
      const job = {
        title: faker.helpers.arrayElement(JOB_TITLES[jobType]),
        description: faker.helpers.arrayElement(JOB_DESCRIPTIONS[jobType]),
        jobType: jobType,
        location: LOCATIONS[faker.number.int({ min: 0, max: LOCATIONS.length - 1 })],
        paymentType: paymentType,
        paymentAmount: paymentType === 'fixed' ? faker.number.int({ min: 10, max: 200 }) : 0,
        createdBy: neighborId,
        status: 'open',
        createdAt: new Date(),
        helperAssigned: null,
        offers: []
      };
      
      jobs.push(job);
    }
  });
  
  return jobs;
}

// Main function to populate the app
async function populateApp() {
  try {
    // Generate helper profiles
    const helpers = await generateHelperProfiles();
    const helperIds = [];
    
    // Create helper users
    for (const helper of helpers) {
      const userRecord = await auth.createUser({
        email: helper.email,
        password: helper.password,
        displayName: helper.fullName
      });
      
      // Store helper profile in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        ...helper,
        createdAt: new Date()
      });
      
      helperIds.push(userRecord.uid);
    }
    
    // Generate neighbor profiles
    const neighbors = await generateNeighborProfiles();
    const neighborIds = [];
    
    // Create neighbor users
    for (const neighbor of neighbors) {
      const userRecord = await auth.createUser({
        email: neighbor.email,
        password: neighbor.password,
        displayName: neighbor.fullName
      });
      
      // Store neighbor profile in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        ...neighbor,
        createdAt: new Date()
      });
      
      neighborIds.push(userRecord.uid);
    }
    
    // Generate and post job listings for neighbors
    const jobs = generateJobPostings(neighborIds);
    
    // Add jobs to Firestore
    for (const job of jobs) {
      await db.collection('jobs').add(job);
    }
    
    console.log('App populated successfully!');
    console.log('Helpers:', helperIds);
    console.log('Neighbors:', neighborIds);
  } catch (error) {
    console.error('Error populating app:', error);
  } finally {
    // Properly close the Firebase Admin connection
    await admin.app().delete();
  }
}

// Run the population script
populateApp().catch(console.error);