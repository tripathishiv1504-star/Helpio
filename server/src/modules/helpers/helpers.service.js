import {
  HelperProfile,
  Category,
  Payment,
  ServiceRequest,
} from '../../models/index.js';
import {
  VERIFICATION_STATUS,
  PRICING_TYPE,
} from '../../../../shared/constants.js';

export async function validateSkills(skills) {
  if (!Array.isArray(skills) || skills.length === 0) {
    const error = new Error('At least one skill must be offered.');
    error.status = 400;
    throw error;
  }

  const validSkills = [];
  for (const s of skills) {
    if (!s.category || !s.subcategory || s.rate === undefined || !s.rateType) {
      const error = new Error('Each skill must include category, subcategory, rate, and rateType.');
      error.status = 400;
      throw error;
    }

    if (!Object.values(PRICING_TYPE).includes(s.rateType)) {
      const error = new Error(`Invalid rateType: ${s.rateType}. Must be one of: ${Object.values(PRICING_TYPE).join(', ')}`);
      error.status = 400;
      throw error;
    }

    if (Number(s.rate) < 0) {
      const error = new Error('Rate cannot be negative.');
      error.status = 400;
      throw error;
    }

    const category = await Category.findById(s.category);
    if (!category || !category.active) {
      const error = new Error(`Category not found or inactive: ${s.category}`);
      error.status = 400;
      throw error;
    }

    const subcategoryExists = category.subcategories.includes(s.subcategory);
    if (!subcategoryExists) {
      const error = new Error(`Subcategory "${s.subcategory}" is not valid for category "${category.name}".`);
      error.status = 400;
      throw error;
    }

    validSkills.push({
      category: category._id,
      subcategory: s.subcategory,
      rate: Number(s.rate),
      rateType: s.rateType,
    });
  }

  return validSkills;
}

export async function getHelperProfile(userId) {
  const profile = await HelperProfile.findOne({ user: userId })
    .populate('skills.category', 'name type')
    .lean();
  return profile;
}

export async function onboardHelper(userId, { bio, skills, location, radiusKm, weeklyAvailability }) {
  const validSkills = await validateSkills(skills);

  let coords = [77.2090, 28.6139]; // Default [lng, lat]
  if (location) {
    if (Array.isArray(location.coordinates) && location.coordinates.length === 2) {
      coords = [Number(location.coordinates[0]), Number(location.coordinates[1])];
    } else if (location.lat !== undefined && location.lng !== undefined) {
      coords = [Number(location.lng), Number(location.lat)];
    }
  }

  const profile = await HelperProfile.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      bio: bio || '',
      skills: validSkills,
      location: {
        type: 'Point',
        coordinates: coords,
      },
      radiusKm: radiusKm ? Number(radiusKm) : 10,
      weeklyAvailability: weeklyAvailability || [],
      verificationStatus: VERIFICATION_STATUS.PENDING,
      isOnline: false, // Cannot be online until approved
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate('skills.category', 'name type');

  return profile;
}

export async function updateProfile(userId, { bio, skills, location, radiusKm }) {
  const profile = await HelperProfile.findOne({ user: userId });
  if (!profile) {
    const error = new Error('Helper profile not found. Please complete onboarding first.');
    error.status = 404;
    throw error;
  }

  if (bio !== undefined) {
    profile.bio = bio;
  }

  if (radiusKm !== undefined) {
    profile.radiusKm = Number(radiusKm);
  }

  if (skills !== undefined) {
    profile.skills = await validateSkills(skills);
  }

  if (location) {
    if (Array.isArray(location.coordinates) && location.coordinates.length === 2) {
      profile.location = {
        type: 'Point',
        coordinates: [Number(location.coordinates[0]), Number(location.coordinates[1])],
      };
    } else if (location.lat !== undefined && location.lng !== undefined) {
      profile.location = {
        type: 'Point',
        coordinates: [Number(location.lng), Number(location.lat)],
      };
    }
  }

  await profile.save();
  return await HelperProfile.findById(profile._id).populate('skills.category', 'name type');
}

export async function updateAvailability(userId, weeklyAvailability) {
  const profile = await HelperProfile.findOne({ user: userId });
  if (!profile) {
    const error = new Error('Helper profile not found. Please complete onboarding first.');
    error.status = 404;
    throw error;
  }

  if (!Array.isArray(weeklyAvailability)) {
    const error = new Error('Weekly availability must be an array of schedule slots.');
    error.status = 400;
    throw error;
  }

  profile.weeklyAvailability = weeklyAvailability;
  await profile.save();
  return profile;
}

export async function setOnlineStatus(userId, isOnline) {
  const profile = await HelperProfile.findOne({ user: userId });
  if (!profile) {
    const error = new Error('Helper profile not found. Please complete onboarding first.');
    error.status = 404;
    throw error;
  }

  if (profile.verificationStatus !== VERIFICATION_STATUS.APPROVED) {
    const error = new Error(
      `Cannot go online. Your profile verification status is "${profile.verificationStatus}". Only approved helpers may go online.`
    );
    error.status = 400;
    throw error;
  }

  profile.isOnline = Boolean(isOnline);
  await profile.save();
  return { isOnline: profile.isOnline, verificationStatus: profile.verificationStatus };
}

export async function getHelperEarnings(userId) {
  // Find all requests completed by this helper
  const requests = await ServiceRequest.find({ helper: userId }).select('_id subcategory pricingType').lean();
  const requestIds = requests.map((r) => r._id);

  if (requestIds.length === 0) {
    return {
      total: 0,
      pending: 0,
      jobsCount: 0,
      jobs: [],
    };
  }

  // Find all payments for these requests
  const payments = await Payment.find({ request: { $in: requestIds } })
    .populate('request', 'subcategory status pricingType location createdAt')
    .sort({ createdAt: -1 })
    .lean();

  let totalEarnings = 0;
  let pendingEarnings = 0;

  const jobList = payments.map((p) => {
    if (p.status === 'paid') {
      totalEarnings += p.helperPayout || 0;
    } else if (p.status === 'pending') {
      pendingEarnings += p.helperPayout || 0;
    }

    return {
      id: p._id.toString(),
      requestId: p.request?._id?.toString(),
      subcategory: p.request?.subcategory || 'Service',
      amount: p.amount,
      platformFee: p.platformFee,
      helperPayout: p.helperPayout,
      status: p.status,
      date: p.createdAt,
    };
  });

  return {
    total: totalEarnings,
    pending: pendingEarnings,
    jobsCount: jobList.length,
    jobs: jobList,
  };
}

export default {
  validateSkills,
  getHelperProfile,
  onboardHelper,
  updateProfile,
  updateAvailability,
  setOnlineStatus,
  getHelperEarnings,
};
