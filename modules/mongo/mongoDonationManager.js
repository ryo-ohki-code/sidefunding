// Donation Manager

let projectsDb;

function setProjectsDb(db) {
    projectsDb = db;
}

async function addDonation(_id, donationData) {
    try {
        const result = await projectsDb.findByIdAndUpdate(
            _id,
            {
                $push: { donations: donationData } 
            },
            { new: true }
        );

        // console.log('Donation added successfully:', result);
        return result;
    } catch (error) {
        console.error('Error adding donation:', error);
        throw error;
    }
}

async function removeDonationById(_id, donationId) {
    try {
        const result = await projectsDb.findByIdAndUpdate(
            _id,
            {
                $pull: {
                    donations: { id: donationId }
                }
            },
            { new: true }
        );

        // console.log('Donation removed successfully:', result);
        return result;
    } catch (error) {
        console.error('Error removing donation:', error);
        throw error;
    }
}

// Update a specific donation by its ID
async function updateDonationById(_id, donationId, updateData) {
    try {
        const setFields = {};
        Object.keys(updateData).forEach(key => {
            setFields[`donations.$[elem].${key}`] = updateData[key];
        });

        const result = await projectsDb.findByIdAndUpdate(
            _id,
            { $set: setFields },
            {
                arrayFilters: [{ "elem.id": donationId }],
                new: true
            }
        );

        // console.log('Donation updated successfully:', result);
        return result;
    } catch (error) {
        console.error('Error updating donation:', error);
        throw error;
    }
}


module.exports = {
    setProjectsDb,
    addDonation,
    removeDonationById,
    updateDonationById,
};
