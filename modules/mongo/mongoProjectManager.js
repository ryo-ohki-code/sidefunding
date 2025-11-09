// Project Manager

let projectsDb;

function setProjectsDb(db) {
    projectsDb = db;
}

// Add a new project
async function addProject(projectData) {
    try {
        const newProject = new projectsDb(projectData);
        const result = await newProject.save();
        // console.log('Project created successfully:', result);
        return result;
    } catch (error) {
        console.error('Error creating project:', error);
        throw error;
    }
}

// Delete a project
async function deleteProject(projectId) {
    try {
        const result = await projectsDb.findByIdAndDelete(projectId);
        if (!result) {
            throw new Error('Project not found');
        }
        // console.log('Project deleted successfully:', result);
        return result;
    } catch (error) {
        console.error('Error deleting project:', error);
        throw error;
    }
}

// Update a specific project by its ID
async function updateProjectById(_id, updateData) {
    try {
        const result = await projectsDb.findByIdAndUpdate(
            _id,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        // console.log('Project updated successfully:', result);
        return result;
    } catch (error) {
        console.error('Error updating project:', error);
        throw error;
    }
}

// Update project status once outdated
async function updateProjectsStatus() {
    try {
        const now = new Date();

        const result = await projectsDb.updateMany(
            {
                "projectData.deadline": { $lt: now },
                "status": { $ne: "inactive" } // Only update if not already inactive
            },
            {
                $set: {
                    status: "inactive"
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`Updated ${result.modifiedCount} projects to inactive status`);
        }
    } catch (err) {
        console.error('Error in project cleanup:', err);
    }
}

async function addImage(_id, imageData) {
    try {
        const result = await projectsDb.findByIdAndUpdate(
            _id,
            {
                $push: { 'projectData.images': imageData } // Add donation to donations array
            },
            { new: true } // Return the updated document
        );

        // console.log('Image added successfully:', result);
        return result;
    } catch (error) {
        console.error('Error image donation:', error);
        throw error;
    }
}

async function removeimageByUrl(_id, url) {
    try {
        const result = await projectsDb.findByIdAndUpdate(
            _id,
            {
                $pull: {
                    "projectData.images": { url: url }
                }
            },
            { new: true } // Return the updated document
        );

        // console.log('Image removed successfully:', result);
        return result;
    } catch (error) {
        console.error('Error removing Image:', error);
        throw error;
    }
}

module.exports = {
    setProjectsDb,
    addProject,
    deleteProject,
    updateProjectById,
    updateProjectsStatus,
    addImage,
    removeimageByUrl
};
