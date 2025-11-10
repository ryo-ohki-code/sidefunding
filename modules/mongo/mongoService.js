// const MongoDB = require('./mongo.js');

const mongoose = require('mongoose');

const MongoDB = async (dbAddress) => {
  try {
    await mongoose.connect(dbAddress || '');
    console.log('MongoDB connected successfully');
    return mongoose;
  } catch (error) {
    console.error('Connection error:', error);
    process.exit(1);
  }
};

const { projectSchema } = require('./projectSchema.js');

let projectsDb;
let db;
async function initDB(dataBaseUrl = "mongodb://localhost:27017/crowdfunding") {
    try {
        db = await MongoDB(dataBaseUrl);
        projectsDb = db.model('crowdfunding', projectSchema);
        console.log('Database initialized successfully');
        return projectsDb;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

// Clean up expired 'waiting' donations by removing them from the array
async function cleanupExpiredDonations() {
    try {
        const now = new Date();
        const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
        
        const result = await projectsDb.updateMany(
            {
                $or: [
                    {
                        "donations.status": "waiting",
                        "donations.expiresAt": { $lt: now }
                    },
                    {
                        "donations.status": "cancelled",
                        "donations.updatedAt": { $lt: fiveDaysAgo }
                    }
                ]
            },
            {
                $pull: {
                    donations: {
                        $or: [
                            {
                                status: "waiting",
                                expiresAt: { $lt: now }
                            },
                            {
                                status: "cancelled",
                                updatedAt: { $lt: fiveDaysAgo }
                            }
                        ]
                    }
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`Removed ${result.modifiedCount} expired donations`);
        }
    } catch (err) {
        console.error('Error in donation cleanup:', err);
    }
}


// Complex search with multiple filtering options
async function searchProjects(filters) {
    const query = {};
    console.log(filters)
    // Exact match filters
    if (filters.id !== undefined && filters.id !== null) query.id = filters.id;
    if (filters.owner) query['owner.name'] = filters.owner;
    if (filters.title) query['projectData.title'] = filters.title;
    
    if (filters.country) {
        query['owner.country'] = { $regex: filters.country, $options: 'i' };
    }
    if (filters.city) {
        query['owner.city'] = { $regex: filters.city, $options: 'i' };
    }
    
    // Text search filters (works on title, owner.name, and description)
    if (filters.searchTerm) {
        query.$or = [
            { 'projectData.title': { $regex: filters.searchTerm, $options: 'i' } },
            { 'owner.name': { $regex: filters.searchTerm, $options: 'i' } },
            { 'projectData.description': { $regex: filters.searchTerm, $options: 'i' } }
        ];
    }

    // Date range filters
    // Creation date filters
    if (filters.creation) {
        query['projectData.creation'] = { ...query['projectData.creation'], $gte: new Date(filters.creation) };
    }
    // Deadline date filters
    if (filters.deadline) {
        query['projectData.deadline'] = { ...query['projectData.deadline'], $lte: new Date(filters.deadline) };
    }

    // Numeric range filters
    if (filters.minGoal !== undefined && filters.minGoal !== null) {
        query['goal.goalUsd'] = { ...query['goal.goalUsd'], $gte: filters.minGoal };
    }
    if (filters.maxGoal !== undefined && filters.maxGoal !== null) {
        query['goal.goalUsd'] = { ...query['goal.goalUsd'], $lte: filters.maxGoal };
    }

    // Status filter (active/inactive)
    if (filters.status === 'active') {
        query.status = 'active';

    } else if (filters.status === 'inactive') {
        query.status = 'inactive';
    }

    // Additional filters
    if (filters.minRaised !== undefined && filters.minRaised !== null) {
        query['goal.raisedUsd'] = { ...query['goal.raisedUsd'], $gte: filters.minRaised };
    }

    const projects = await projectsDb.find(query);
    return projects;
}


// Export functions
module.exports = {
    initDB,
    cleanupExpiredDonations,
    searchProjects
};
