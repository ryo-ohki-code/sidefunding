// Find project inside DB

function setProjectsDb(db) {
    projectsDb = db;
}

async function findById(id) {
    const project = await projectsDb.find({
        id: id
    });
    return project[0];
}

async function findActiveProjects() {
    const activeProjects = await projectsDb.find({
         status: 'active'
    });
    return activeProjects;
}

async function findInactiveProjects() {
    const activeProjects = await projectsDb.find({
         status: 'inactive'
    });
    return activeProjects;
}

async function findActiveProjectsPagination(skip, limit) {
    const activeProjects = await projectsDb.find({
         status: 'active'
    })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }); // Sort by creation date, newest first

    return activeProjects;
}

async function findInactiveProjectsPagination(skip, limit) {
    const inactiveProjects = await projectsDb.find({
         status: 'inactive'
    })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    return inactiveProjects;
}

async function findProjectByDonationId(id) {
    return await projectsDb.findOne({ "donations.id": id });
};

async function findProjectByDonation_Id(_id) {
    return await projectsDb.findOne({ "donations._id": _id });
};

async function findDonationById(id) {
    const result = await projectsDb.findOne(
        { "donations.id": id },
        { 
            donations: { 
                $elemMatch: { "id": id } 
            } 
        }
    );
    
    return result?.donations?.[0] || null;
}

async function findDonationBy_Id(_id) {
    const result = await projectsDb.findOne(
        { "donations._id": _id },
        { 
            donations: { 
                $elemMatch: { "_id": _id } 
            } 
        }
    );
    
    return result?.donations?.[0] || null;
}

async function findHowManyAccountPerWallet(address){
    const existingWalletCount = await projectsDb.countDocuments({
        "wallet.address": address
    });
    console.log('Same address found successfully:', existingWalletCount);
    return existingWalletCount;
}

async function countActiveProjects() {
    return await projectsDb.countDocuments({ status: 'active' });
}

async function countInactiveProjects() {
    return await projectsDb.countDocuments({ status: 'inactive' });
}


module.exports = {
    setProjectsDb,
    findById,
    findActiveProjects,
    findInactiveProjects,
    findActiveProjectsPagination,
    findInactiveProjectsPagination,
    findProjectByDonationId,
    findProjectByDonation_Id,
    findDonationById,
    findDonationBy_Id,
    findHowManyAccountPerWallet,
    countActiveProjects,
    countInactiveProjects
};
