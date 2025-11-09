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

// const { findData } = require('./mongoFind.js');

let projectsDb;
let db;
async function initDB(dataBaseUrl = "mongodb://localhost:27017/crowdfunding") {
    try {
        db = await MongoDB(dataBaseUrl);
        projectsDb = db.model('crowdfunding', projectSchema);
        console.log('Database initialized successfully');
        return projectsDb; // Return the model
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

// // find project inside DB
// async function findById(id) {
//     const project = await projectsDb.find({
//         id: id
//     });
//     return project[0];
// }

// async function findProjectByDonationId(id) {
//     return await projectsDb.findOne({ "donations.id": id });
// };

// async function findProjectByDonation_Id(_id) {
//     return await projectsDb.findOne({ "donations._id": _id });
// };

// async function findDonationById(id) {
//     const result = await projectsDb.findOne(
//         { "donations.id": id },
//         { 
//             donations: { 
//                 $elemMatch: { "id": id } 
//             } 
//         }
//     );
    
//     return result?.donations?.[0] || null;
// }
// async function findDonationBy_Id(_id) {
//     const result = await projectsDb.findOne(
//         { "donations._id": _id },
//         { 
//             donations: { 
//                 $elemMatch: { "_id": _id } 
//             } 
//         }
//     );
    
//     return result?.donations?.[0] || null;
// }


// async function findActiveProjects() {
//     const activeProjects = await projectsDb.find({
//          status: 'active'
//     });
//     return activeProjects;
// }
// async function findInactiveProjects() {
//     const activeProjects = await projectsDb.find({
//          status: 'inactive'
//     });
//     return activeProjects;
// }

// async function findActiveProjectsPagination(skip, limit) {
//     const activeProjects = await projectsDb.find({
//          status: 'active'
//     })
//         .skip(skip)
//         .limit(limit)
//         .sort({ createdAt: -1 }); // Sort by creation date, newest first

//     return activeProjects;
// }

// async function findInactiveProjectsPagination(skip, limit) {
//     const inactiveProjects = await projectsDb.find({
//          status: 'inactive'
//     })
//         .skip(skip)
//         .limit(limit)
//         .sort({ createdAt: -1 });

//     return inactiveProjects;
// }

// async function howManyAccountPerWallet(address){
//     const existingWalletCount = await projectsDb.countDocuments({
//         "wallet.address": address
//     });
//     console.log('Same address found successfully:', existingWalletCount);
//     return existingWalletCount;
// }

// // Add a new project
// async function addProject(projectData) {
//     try {
//         const newProject = new projectsDb(projectData);
//         const result = await newProject.save();
//         console.log('Project created successfully:', result);
//         return result;
//     } catch (error) {
//         console.error('Error creating project:', error);
//         throw error;
//     }
// }

// // Delete a project
// async function deleteProject(projectId) {
//     try {
//         const result = await projectsDb.findByIdAndDelete(projectId);
//         if (!result) {
//             throw new Error('Project not found');
//         }
//         console.log('Project deleted successfully:', result);
//         return result;
//     } catch (error) {
//         console.error('Error deleting project:', error);
//         throw error;
//     }
// }

// // Update a specific project by its ID
// async function updateProjectById(_id, updateData) {
//     try {
//         const result = await projectsDb.findByIdAndUpdate(
//             _id,
//             { $set: updateData },
//             { new: true, runValidators: true }
//         );
//         console.log('Project updated successfully:', result);
//         return result;
//     } catch (error) {
//         console.error('Error updating project:', error);
//         throw error;
//     }
// }

// // Find a project and add a donation to it
// async function addDonation(_id, donationData) {
//     try {
//         const result = await projectsDb.findByIdAndUpdate(
//             _id,
//             {
//                 $push: { donations: donationData } // Add donation to donations array
//             },
//             { new: true } // Return the updated document
//         );

//         console.log('Donation added successfully:', result);
//         return result;
//     } catch (error) {
//         console.error('Error adding donation:', error);
//         throw error;
//     }
// }

// async function removeDonationById(_id, donationId) {
//     try {
//         const result = await projectsDb.findByIdAndUpdate(
//             _id,
//             {
//                 $pull: {
//                     donations: { id: donationId }
//                 }
//             },
//             { new: true } // Return the updated document
//         );

//         console.log('Donation removed successfully:', result);
//         return result;
//     } catch (error) {
//         console.error('Error removing donation:', error);
//         throw error;
//     }
// }



// async function addImage(_id, imageData) {
//     try {
//         const result = await projectsDb.findByIdAndUpdate(
//             _id,
//             {
//                 $push: { 'projectData.images': imageData } // Add donation to donations array
//             },
//             { new: true } // Return the updated document
//         );

//         console.log('Image added successfully:', result);
//         return result;
//     } catch (error) {
//         console.error('Error image donation:', error);
//         throw error;
//     }
// }

// async function removeimageByUrl(_id, url) {
//     try {
//         const result = await projectsDb.findByIdAndUpdate(
//             _id,
//             {
//                 $pull: {
//                     "projectData.images": { url: url }
//                 }
//             },
//             { new: true } // Return the updated document
//         );

//         console.log('Image removed successfully:', result);
//         return result;
//     } catch (error) {
//         console.error('Error removing Image:', error);
//         throw error;
//     }
// }

// // Update a specific donation by its ID
// async function updateDonationById(_id, donationId, updateData) {
//     try {
//         const setFields = {};
//         Object.keys(updateData).forEach(key => {
//             setFields[`donations.$[elem].${key}`] = updateData[key];
//         });

//         const result = await projectsDb.findByIdAndUpdate(
//             _id,
//             { $set: setFields },
//             {
//                 arrayFilters: [{ "elem.id": donationId }],
//                 new: true
//             }
//         );

//         console.log('Donation updated successfully:', result);
//         return result;
//     } catch (error) {
//         console.error('Error updating donation:', error);
//         throw error;
//     }
// }


// // Update project status once outdated
// async function updateProjectsStatus() {
//     try {
//         const now = new Date();

//         const result = await projectsDb.updateMany(
//             {
//                 "projectData.deadline": { $lt: now },
//                 "status": { $ne: "inactive" } // Only update if not already inactive
//             },
//             {
//                 $set: {
//                     status: "inactive"
//                 }
//             }
//         );

//         if (result.modifiedCount > 0) {
//             console.log(`Updated ${result.modifiedCount} projects to inactive status`);
//         }
//     } catch (err) {
//         console.error('Error in project cleanup:', err);
//     }
// }

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

// async function cleanupExpiredDonations() {
//     try {
//         const now = new Date();
//         const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

//         const result = await projectsDb.updateMany(
//             {
//                 "donations.status": "waiting",
//                 "donations.expiresAt": { $lt: now }
//             },
//             {
//                 $pull: {
//                     donations: {
//                         status: "waiting",
//                         expiresAt: { $lt: now }
//                     }
//                 }
//             }
//         );

//         if (result.modifiedCount > 0) {
//             console.log(`Removed ${result.modifiedCount} expired waiting donations`);
//         }
//     } catch (err) {
//         console.error('Error in donation cleanup:', err);
//     }
// }

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
        // query['projectData.deadline'] = { ...query['projectData.deadline'], $gte: new Date() };

    } else if (filters.status === 'inactive') {
        query.status = 'inactive';
        // query['projectData.deadline'] = { ...query['projectData.deadline'], $lte: new Date() };
    }

    // Additional filters
    if (filters.minRaised !== undefined && filters.minRaised !== null) {
        query['goal.raisedUsd'] = { ...query['goal.raisedUsd'], $gte: filters.minRaised };
    }

    const projects = await projectsDb.find(query);
    return projects;
}

// async function complexSearchWithPagination(filters, page = 1, limit = 10) {
//     const query = {};

//     // Exact match filters
//     if (filters.id !== undefined && filters.id !== null) query.id = filters.id;
//     if (filters.owner) query.owner = filters.owner;
//     if (filters.title) query.title = filters.title;

//     // Text search filters
//     if (filters.searchTerm) {
//         query.$or = [
//             { title: { $regex: filters.searchTerm, $options: 'i' } },
//             { owner: { $regex: filters.searchTerm, $options: 'i' } },
//             { description: { $regex: filters.searchTerm, $options: 'i' } }
//         ];
//     }

//     // Date range filters
//     if (filters.startDate) {
//         query.creation = { ...query.creation, $gte: new Date(filters.startDate) };
//     }
//     if (filters.endDate) {
//         query.creation = { ...query.creation, $lte: new Date(filters.endDate) };
//     }

//     // Deadline date filters
//     if (filters.deadlineStart) {
//         query.deadline = { ...query.deadline, $gte: new Date(filters.deadlineStart) };
//     }
//     if (filters.deadlineEnd) {
//         query.deadline = { ...query.deadline, $lte: new Date(filters.deadlineEnd) };
//     }

//     // Numeric range filters
//     if (filters.minGoal !== undefined && filters.minGoal !== null) {
//         query.goal = { ...query.goal, $gte: filters.minGoal };
//     }
//     if (filters.maxGoal !== undefined && filters.maxGoal !== null) {
//         query.goal = { ...query.goal, $lte: filters.maxGoal };
//     }

//     // Status filter
//     if (filters.status === 'active') {
//         query.deadline = { $gt: new Date() };
//     } else if (filters.status === 'inactive') {
//         query.deadline = { $lt: new Date() };
//     }

//     // Additional filters
//     if (filters.minRaised !== undefined && filters.minRaised !== null) {
//         query.raisedUsd = { ...query.raisedUsd, $gte: filters.minRaised };
//     }

//     const skip = (page - 1) * limit;
//     const projects = await projectsDb.find(query).skip(skip).limit(limit);
//     const total = await projectsDb.countDocuments(query);

//     return {
//         projects,
//         pagination: {
//             page,
//             limit,
//             total,
//             pages: Math.ceil(total / limit)
//         }
//     };
// }

// Usage examples:
/*
// Find by owner and search term
const results1 = await complexSearch({
    owner: "John Doe",
    searchTerm: "blockchain"
});

// Find active projects with minimum goal of 1000
const results2 = await complexSearch({
    status: "active",
    minGoal: 1000
});

// Find projects created between dates
const results3 = await complexSearch({
    startDate: "2023-01-01",
    endDate: "2023-12-31"
});

// Find projects with specific keywords in description
const results4 = await complexSearch({
    searchTerm: "crypto wallet",
    status: "active"
});
*/


// Export functions
module.exports = {
    initDB,
    // db,
    // projectsDb,
    // findActiveProjects,
    // findActiveProjectsPagination,
    // findInactiveProjects,
    // findInactiveProjectsPagination,
    // findById,
    // findProjectByDonationId,
    // findProjectByDonation_Id,
    // findDonationById,
    // findDonationBy_Id,
    // howManyAccountPerWallet,

    // addProject,
    // deleteProject,
    // updateProjectById,
    // addDonation,
    // removeDonationById,
    // updateDonationById,
    // addImage,
    // removeimageByUrl,
    // updateProjectsStatus,
    cleanupExpiredDonations,
    searchProjects
};
