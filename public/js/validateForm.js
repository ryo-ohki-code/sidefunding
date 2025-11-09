// Form validation
const minTitleLength = 15;
const minDescriptionLength = 200;

function validateForm() {
    const name = document.querySelector('input[name="owner"]').value.trim();
    const title = document.querySelector('input[name="title"]').value;
    //- const description = document.querySelector('textarea[name="description"]').value;
    const description = easyMDE.value();
    const payWith = document.querySelector('select[name="payWith"]').value;
    const wallet = document.querySelector('input[name="address"]').value;
    const goal = document.querySelector('input[name="goal"]').value;
    const deadline = document.querySelector('input[name="deadline"]').value;

    const signature = document.querySelector('input[name="signature"]').value.trim();

    // Clear previous errors
	clearErrors();

    let isValid = true;
	let errorMessage = [];

    // Creator name
	if (name === '') {
		errorMessage.push('Name is required');
		isValid = false;
	} else if (name.length < 3) {
		errorMessage.push('Name must be at least 3 characters');
		isValid = false;
	}

	// Title
	if (title === '') {
		errorMessage.push('Title is required');
		isValid = false;
	} else if (title.length < minTitleLength) {
		errorMessage.push(`Title must be at least ${minTitleLength} characters`);
		isValid = false;
	}

	// Goal
	if (goal === '') {
		errorMessage.push('You must set a goal');
		isValid = false;
	} else if (Number(goal) <= 0 || isNaN(Number(goal))) {
		errorMessage.push('Invalid goal');
		isValid = false;
	}

	// Deadline
	if(deadline === ''){
		errorMessage.push('You must set a deadline');
		isValid = false;
	} else {
		const deadlineDate = new Date(deadline);
		if (isNaN(deadlineDate.getTime())) {
			errorMessage.push('Invalid deadline date format');
			isValid = false;
		} else if (deadlineDate < new Date()) {
			errorMessage.push('Deadline cannot be in the past');
			isValid = false;
		}
	}

	// Validate description
	if (description === '') {
		errorMessage.push('You must set a description');
		isValid = false;
	} else if (description.length < minDescriptionLength) {
		errorMessage.push(`Description must be at least ${minDescriptionLength} characters`);
		isValid = false;
	}

	if(name && title && goal && deadline && description.length >= minDescriptionLength){
		// Validate coin selection
		if (payWith === '') {
			errorMessage.push('Please select a coin');
			isValid = false;
		}
		// Validate wallet address
		if (wallet === '') {
			errorMessage.push('Please set a funding wallet');
			isValid = false;
		}

		// Validate signature
		if (signature === '') {
			errorMessage.push('Please sign with MetaMask or custom key');
			isValid = false;
		} else if (signature < 16) {
			errorMessage.push('Signature must be at least 16 characters');
			isValid = false;
		}
	}
	
	if (isValid) {
		return true;
	} else{
		showError(errorMessage);
		return false;
	}

	// Validate email
	//- const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	//- if (email === '') {
	//-     errorMessage.push('Email is required');
	//-     isValid = false;
	//- } else if (!emailRegex.test(email)) {
	//-     errorMessage.push('Please enter a valid email address');
	//-     isValid = false;
	//- }

	// Validate phone (optional but if provided must be valid)
	//- if (phone !== '') {
	//-     const phoneRegex = /^[\+]?[0-9]{10,15}$/;
	//-     if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
	//-         errorMessage.push('Please enter a valid phone number');
	//-         isValid = false;
	//-     }
	//- }
}

