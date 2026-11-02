import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import env from '../config/env.js';
import {
  User,
  HelperProfile,
  Category,
  Setting,
} from '../models/index.js';
import {
  ROLES,
  CATEGORY_TYPE,
  PRICING_TYPE,
  VERIFICATION_STATUS,
} from '../../../shared/constants.js';

export async function runSeed(disconnectOnComplete = false) {
  console.log('[Seed] Connecting to database...');
  await connectDB();

  try {
    // 1. Seed or update Setting commissionPercent = 10
    console.log('[Seed] Upserting Setting: commissionPercent=10');
    await Setting.findOneAndUpdate(
      { key: 'commissionPercent' },
      { key: 'commissionPercent', value: 10 },
      { upsert: true, new: true }
    );

    // 2. Seed or update Admin Users
    console.log(`[Seed] Upserting Admin user: ${env.ADMIN_EMAIL}`);
    const adminPasswordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
    await User.findOneAndUpdate(
      { email: env.ADMIN_EMAIL.toLowerCase() },
      {
        name: 'Helpio Admin',
        email: env.ADMIN_EMAIL.toLowerCase(),
        phone: '+10000000000',
        passwordHash: adminPasswordHash,
        roles: [ROLES.ADMIN, ROLES.USER],
        status: 'active',
      },
      { upsert: true, new: true }
    );

    // Also seed admin@helpio.local (with AdminPassword123!) for compatibility
    const adminLocalHash = await bcrypt.hash('AdminPassword123!', 10);
    await User.findOneAndUpdate(
      { email: 'admin@helpio.local' },
      {
        name: 'Helpio Admin Local',
        email: 'admin@helpio.local',
        phone: '+10000000001',
        passwordHash: adminLocalHash,
        roles: [ROLES.ADMIN, ROLES.USER],
        status: 'active',
      },
      { upsert: true, new: true }
    );

    // 3. Seed Categories
    console.log('[Seed] Upserting Categories...');
    const categoryDefinitions = [
      {
        name: 'Community Help',
        type: CATEGORY_TYPE.COMMUNITY,
        subcategories: ['student help', 'elderly care', 'neighbour help', 'errands'],
        active: true,
      },
      {
        name: 'Professional Help',
        type: CATEGORY_TYPE.PROFESSIONAL,
        subcategories: ['electrician', 'plumber', 'carpenter', 'technician'],
        active: true,
      },
      {
        name: 'Instant Local Workforce',
        type: CATEGORY_TYPE.INSTANT,
        subcategories: ['cleaning', 'moving help', 'delivery help', 'event help'],
        active: true,
      },
    ];

    const categoryMap = {};
    for (const catDef of categoryDefinitions) {
      const cat = await Category.findOneAndUpdate(
        { name: catDef.name, type: catDef.type },
        catDef,
        { upsert: true, new: true }
      );
      categoryMap[catDef.type] = cat;
    }

    // 4. Seed 8 Demo Helpers spread around SEED_CENTER_LAT / SEED_CENTER_LNG
    console.log(
      `[Seed] Upserting 8 Demo Helpers around [Lat: ${env.SEED_CENTER_LAT}, Lng: ${env.SEED_CENTER_LNG}]...`
    );

    const helperDefs = [
      {
        name: 'Demo Helper One',
        email: 'helper1@helpio.local',
        phone: '+919876543200',
        password: 'Password123!',
        bio: 'Verified professional helper ready to take requests.',
        categoryType: CATEGORY_TYPE.PROFESSIONAL,
        subcategory: 'electrician',
        rate: 400,
        rateType: PRICING_TYPE.FIXED,
        distanceKm: 0.5,
        angleDeg: 0,
      },
      {
        name: 'Aarav Sharma',
        email: 'helper.aarav@helpio.com',
        phone: '+919876543210',
        bio: 'Certified master electrician with 8+ years experience in domestic & commercial setups.',
        categoryType: CATEGORY_TYPE.PROFESSIONAL,
        subcategory: 'electrician',
        rate: 350,
        rateType: PRICING_TYPE.FIXED,
        distanceKm: 1.2,
        angleDeg: 0,
      },
      {
        name: 'Priya Patel',
        email: 'helper.priya@helpio.com',
        phone: '+919876543211',
        bio: 'Professional plumber specializing in pipe repair, leak detection and fixture installation.',
        categoryType: CATEGORY_TYPE.PROFESSIONAL,
        subcategory: 'plumber',
        rate: 400,
        rateType: PRICING_TYPE.FIXED,
        distanceKm: 2.1,
        angleDeg: 45,
      },
      {
        name: 'Vikram Singh',
        email: 'helper.vikram@helpio.com',
        phone: '+919876543212',
        bio: 'Experienced carpenter skilled in furniture assembly, door locks and custom woodwork.',
        categoryType: CATEGORY_TYPE.PROFESSIONAL,
        subcategory: 'carpenter',
        rate: 450,
        rateType: PRICING_TYPE.FIXED,
        distanceKm: 1.8,
        angleDeg: 90,
      },
      {
        name: 'Rahul Verma',
        email: 'helper.rahul@helpio.com',
        phone: '+919876543213',
        bio: 'Appliance & gadget technician for AC, washing machines, and home electronics.',
        categoryType: CATEGORY_TYPE.PROFESSIONAL,
        subcategory: 'technician',
        rate: 500,
        rateType: PRICING_TYPE.FIXED,
        distanceKm: 3.0,
        angleDeg: 135,
      },
      {
        name: 'Neha Gupta',
        email: 'helper.neha@helpio.com',
        phone: '+919876543214',
        bio: 'Volunteer companion for elderly care, medication reminders and grocery visits.',
        categoryType: CATEGORY_TYPE.COMMUNITY,
        subcategory: 'elderly care',
        rate: 0,
        rateType: PRICING_TYPE.FREE,
        distanceKm: 0.8,
        angleDeg: 180,
      },
      {
        name: 'Karan Mehra',
        email: 'helper.karan@helpio.com',
        phone: '+919876543215',
        bio: 'College tutor providing math & science student homework support and mentoring.',
        categoryType: CATEGORY_TYPE.COMMUNITY,
        subcategory: 'student help',
        rate: 0,
        rateType: PRICING_TYPE.FREE,
        distanceKm: 2.4,
        angleDeg: 225,
      },
      {
        name: 'Ravi Kumar',
        email: 'helper.ravi@helpio.com',
        phone: '+919876543216',
        bio: 'Fast and reliable moving help and heavy lifting specialist for apartment moves.',
        categoryType: CATEGORY_TYPE.INSTANT,
        subcategory: 'moving help',
        rate: 200,
        rateType: PRICING_TYPE.HOURLY,
        distanceKm: 1.5,
        angleDeg: 270,
      },
      {
        name: 'Sunita Devi',
        email: 'helper.sunita@helpio.com',
        phone: '+919876543217',
        bio: 'Meticulous deep cleaning professional for residential flats, kitchens and bathrooms.',
        categoryType: CATEGORY_TYPE.INSTANT,
        subcategory: 'cleaning',
        rate: 250,
        rateType: PRICING_TYPE.HOURLY,
        distanceKm: 2.7,
        angleDeg: 315,
      },
    ];

    const defaultHelperPasswordHash = await bcrypt.hash('Helper123!', 10);
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (const h of helperDefs) {
      // 1 deg lat is ~111km, 1 deg lng is ~111km * cos(lat)
      const latOffset = (h.distanceKm / 111.0) * Math.cos((h.angleDeg * Math.PI) / 180);
      const lngOffset =
        (h.distanceKm / (111.0 * Math.cos((env.SEED_CENTER_LAT * Math.PI) / 180))) *
        Math.sin((h.angleDeg * Math.PI) / 180);

      const helperLat = Math.round((env.SEED_CENTER_LAT + latOffset) * 100000) / 100000;
      const helperLng = Math.round((env.SEED_CENTER_LNG + lngOffset) * 100000) / 100000;

      // Upsert user
      const user = await User.findOneAndUpdate(
        { email: h.email.toLowerCase() },
        {
          name: h.name,
          email: h.email.toLowerCase(),
          phone: h.phone,
          passwordHash: h.password ? await bcrypt.hash(h.password, 10) : defaultHelperPasswordHash,
          roles: [ROLES.USER, ROLES.HELPER],
          status: 'active',
        },
        { upsert: true, new: true }
      );

      // Upsert helper profile
      const category = categoryMap[h.categoryType];
      await HelperProfile.findOneAndUpdate(
        { user: user._id },
        {
          user: user._id,
          bio: h.bio,
          skills: [
            {
              category: category._id,
              subcategory: h.subcategory,
              rate: h.rate,
              rateType: h.rateType,
            },
          ],
          location: {
            type: 'Point',
            coordinates: [helperLng, helperLat], // GeoJSON order: [lng, lat]
          },
          radiusKm: 15,
          isOnline: true, // PRD says approved, online
          verificationStatus: VERIFICATION_STATUS.APPROVED,
          verificationNote: 'Verified during seed initialization',
          weeklyAvailability: daysOfWeek.map((day) => ({
            day,
            start: '08:00',
            end: '20:00',
          })),
          stats: {
            ratingAvg: 4.8,
            ratingCount: 12,
            completed: 15,
            accepted: 18,
            offered: 20,
          },
          earningsTotal: 4500,
        },
        { upsert: true, new: true }
      );
    }

    console.log('[Seed] Seeding completed successfully!');
  } finally {
    if (disconnectOnComplete) {
      await disconnectDB();
    }
  }
}

// Execute if run directly
if (process.argv[1]?.endsWith('index.js')) {
  runSeed(true)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error seeding data:', err);
      process.exit(1);
    });
}

export default runSeed;
