const admin = require('firebase-admin');
const { faker } = require('@faker-js/faker');
const axios = require('axios');

// Baltimore coordinates
const BALTIMORE_LAT = 39.2904;
const BALTIMORE_LNG = -76.6122;

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

// Cities within 100 miles of Baltimore
const SURROUNDING_LOCATIONS = [
  // Pennsylvania
  { name: "Philadelphia, PA", lat: 39.9526, lng: -75.1652, distance: 100 },
  { name: "Harrisburg, PA", lat: 40.2732, lng: -76.8867, distance: 80 },
  { name: "York, PA", lat: 39.9626, lng: -76.7277, distance: 50 },
  { name: "Lancaster, PA", lat: 40.0379, lng: -76.3055, distance: 70 },
  
  // Delaware
  { name: "Wilmington, DE", lat: 39.7447, lng: -75.5476, distance: 70 },
  { name: "Dover, DE", lat: 39.1582, lng: -75.5244, distance: 90 },
  
  // Maryland (outside Baltimore metro)
  { name: "Frederick, MD", lat: 39.4142, lng: -77.4105, distance: 50 },
  { name: "Annapolis, MD", lat: 38.9784, lng: -76.4922, distance: 30 },
  { name: "Cumberland, MD", lat: 39.6515, lng: -78.7606, distance: 150 },
  { name: "Salisbury, MD", lat: 38.3607, lng: -75.5994, distance: 130 },
  
  // West Virginia
  { name: "Martinsburg, WV", lat: 39.4558, lng: -77.9642, distance: 100 },
  
  // Virginia
  { name: "Winchester, VA", lat: 39.1838, lng: -78.1653, distance: 100 },
  { name: "Richmond, VA", lat: 37.5407, lng: -77.4360, distance: 160 },
  { name: "Norfolk, VA", lat: 36.8529, lng: -76.2858, distance: 200 },
  
  // Washington D.C. area
  { name: "Arlington, VA", lat: 38.8816, lng: -77.0910, distance: 40 }
];

// Initialize Firebase Admin SDK
const serviceAccount = require('./service_account_key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
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

function generateAddress(location) {
  // Generate a random street number for the given location
  const streetNumber = faker.number.int({ min: 100, max: 9999 });
  const streetName = faker.location.street();
  
  return `${streetNumber} ${streetName}, ${location.name}`;
}

async function generateProfiles(isHelper, localCount, surroundingCount) {
  const profiles = [];
  
  // First generate local Baltimore profiles
  const BALTIMORE_LOCATIONS = [
    "1400 N Charles St, Baltimore, MD 21201",
    "2401 Maryland Ave, Baltimore, MD 21218",
    "3100 St Paul St, Baltimore, MD 21218",
    "2700 N Charles St, Baltimore, MD 21218",
    "1600 Cathedral St, Baltimore, MD 21201",
    "1800 Eutaw Pl, Baltimore, MD 21217",
    "2100 Calvert St, Baltimore, MD 21218",
    "3400 Greenmount Ave, Baltimore, MD 21218",
    "2600 N Howard St, Baltimore, MD 21216",
    "1300 W 41st St, Baltimore, MD 21211",
    "4100 Roland Ave, Baltimore, MD 21211",
    "3800 Canterbury Rd, Baltimore, MD 21218",
    "2500 Cold Spring Ln, Baltimore, MD 21214",
    "1100 E 33rd St, Baltimore, MD 21218",
    "2700 Hampden Ave, Baltimore, MD 21211"
  ];

  // Local Baltimore profiles
  for (let i = 0; i < localCount; i++) {
    const profilePicture = await generateProfilePicture();
    
    const profile = {
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      password: 'TestUser123!',
      address: BALTIMORE_LOCATIONS[i],
      aboutMe: faker.helpers.arrayElement(ABOUT_ME_DESCRIPTIONS),
      isHelper: isHelper,
      profileImage: profilePicture,
      location: {
        address: BALTIMORE_LOCATIONS[i],
        coordinates: {
          latitude: BALTIMORE_LAT,
          longitude: BALTIMORE_LNG
        }
      }
    };

    // Add helper-specific fields if it's a helper profile
    if (isHelper) {
      profile.jobTypes = faker.helpers.arrayElements(Object.keys(JOB_TITLES), { min: 1, max: 3 });
      profile.helpDescription = faker.helpers.arrayElement(ABOUT_ME_DESCRIPTIONS);
      profile.bankInfo = {
        accountName: faker.person.fullName(),
        accountNumber: faker.finance.accountNumber(),
        routingNumber: faker.finance.routingNumber()
      };
    }
    
    profiles.push(profile);
  }

  // Surrounding area profiles
  for (let i = 0; i < surroundingCount; i++) {
    const location = SURROUNDING_LOCATIONS[i];
    const profilePicture = await generateProfilePicture();
    
    const profile = {
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      password: 'TestUser123!',
      address: generateAddress(location),
      aboutMe: faker.helpers.arrayElement(ABOUT_ME_DESCRIPTIONS),
      isHelper: isHelper,
      profileImage: profilePicture,
      location: {
        address: generateAddress(location),
        coordinates: {
          latitude: location.lat,
          longitude: location.lng
        }
      }
    };

    // Add helper-specific fields if it's a helper profile
    if (isHelper) {
      profile.jobTypes = faker.helpers.arrayElements(Object.keys(JOB_TITLES), { min: 1, max: 3 });
      profile.helpDescription = faker.helpers.arrayElement(ABOUT_ME_DESCRIPTIONS);
      profile.bankInfo = {
        accountName: faker.person.fullName(),
        accountNumber: faker.finance.accountNumber(),
        routingNumber: faker.finance.routingNumber()
      };
    }
    
    profiles.push(profile);
  }
  
  return profiles;
}

// Modify the job generation to handle the new location structure
function generateJobPostings(neighborIds, profiles) {
  const jobs = [];
  
  neighborIds.forEach((neighborId, index) => {
    // Get the profile for this neighbor
    const neighborProfile = profiles[index];
    
    // Create 1-3 jobs per neighbor
    const jobCount = faker.number.int({ min: 1, max: 3 });
    
    for (let i = 0; i < jobCount; i++) {
      const jobType = faker.helpers.arrayElement(Object.keys(JOB_TITLES));
      const paymentType = faker.helpers.arrayElement(['fixed', 'tip', 'free']);
      
      const job = {
        title: faker.helpers.arrayElement(JOB_TITLES[jobType]),
        description: faker.helpers.arrayElement(JOB_DESCRIPTIONS[jobType]),
        jobType: jobType,
        location: neighborProfile.address,
        locationCoordinates: neighborProfile.location.coordinates,
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
    // Generate helper profiles (15 total: 8 local, 7 surrounding)
    const helpers = await generateProfiles(true, 8, 7);
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
    
    // Generate neighbor profiles (15 total: 8 local, 7 surrounding)
    const neighbors = await generateProfiles(false, 8, 7);
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
    const jobs = generateJobPostings(neighborIds, neighbors);
    
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