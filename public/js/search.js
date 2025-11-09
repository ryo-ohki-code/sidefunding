document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
    checkbox.checked = false;
});

if(document.getElementById('RESET')){
    document.getElementById('RESET').addEventListener('click', function() {
        document.getElementById('SEARCH_FORM').reset();
        if(document.getElementById('FILTER')) document.getElementById('FILTER').reset();
        document.getElementById('RESULTS').innerHTML = '<div class="no-results">Please fill in at least one search criterion</div>';
    });
}


document.getElementById('SEARCH_FORM').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const params = new URLSearchParams();
    
    // Only add non-empty form fields to params
    for (let [key, value] of formData.entries()) {
        if (value !== '' && value !== null && value !== undefined) {
            params.append(key, value);
        }
    }
    
    // Check if we have any valid parameters
    if (params.toString() === '') {
        console.log('No form data to process');
        document.getElementById('RESULTS').innerHTML = '<div class="no-results">Please fill in at least one search criterion</div>';
        return;
    }
    
    console.log('Params being sent:', params.toString());
    //- window.location.href = '/projects/search?' + params.toString();
    
    fetch('/projects/search/api?' + params.toString())
        .then(response => response.json())
        .then(data => {
            console.log(data)
            const resultsContainer = document.getElementById('RESULTS');
            if (data.length > 0) {
                let html = '';
                data.forEach(project => {
                    // Truncate description to 300 characters with ellipsis
                    let truncatedDescription = project.projectData.description;
                    if (project.projectData.description.length > 300) {
                        truncatedDescription = project.projectData.description.substring(0, 300) + '...';
                    }
                    
                    html += `
                        <div class="project-card">
                            <h3><a href="/project/${project.id}">${project.projectData.title}</a></h3>
                            <p>Deadline: ${new Date(project.projectData.deadline).toLocaleDateString()}</p>
                            <p style="text-align:justify;">
                                ${truncatedDescription}
                            </p>
                            <p>
                                <b>Goal: $${project.goal.goalUsd?.toLocaleString() || '0'} | Raised: 
                                <span style="color:darkgreen;">$${project.goal.raisedUsd?.toLocaleString() || '0'}</span></b>
                            </p>
                            <p>
                                <b>Goal: ${project.wallet?.coin || ''} (${project.wallet?.network || ''}) ${project.goal.goalCryptocurrency || '0'} | Raised: 
                                <span style="color:darkgreen;">${project.wallet?.coin || ''} ${project.goal.raisedCryptocurrency || '0'}</span></b>
                            </p>
                        </div>
                    `;
                });
                resultsContainer.innerHTML = html;
            } else {
                resultsContainer.innerHTML = '<div class="no-results">No projects found matching your criteria</div>';
            }

        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('RESULTS').innerHTML = '<div class="no-results">Error fetching results</div>';
        });
});
