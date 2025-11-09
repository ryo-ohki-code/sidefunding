document.addEventListener('DOMContentLoaded', function () {
	const slider = document.getElementById('slider');
	const prevBtn = document.querySelector('.prev');
	const nextBtn = document.querySelector('.next');
	const indicatorsContainer = document.getElementById('indicators');
	const slides = document.querySelectorAll('.slide');

	let currentIndex = 0;
	const totalSlides = slides.length;

	// Create indicators
	for (let i = 0; i < totalSlides; i++) {
		const indicator = document.createElement('div');
		indicator.classList.add('indicator');
		if (i === 0) indicator.classList.add('active');
		indicator.addEventListener('click', () => goToSlide(i));
		indicatorsContainer.appendChild(indicator);
	}

	const indicators = document.querySelectorAll('.indicator');

	function updateSlider() {
		slider.style.transform = `translateX(-${currentIndex * 100}%)`;

		// Update active indicator
		indicators.forEach((indicator, index) => {
			if (index === currentIndex) {
				indicator.classList.add('active');
			} else {
				indicator.classList.remove('active');
			}
		});
	}

	function goToSlide(index) {
		currentIndex = index;
		updateSlider();
	}

	function nextSlide() {
		currentIndex = (currentIndex + 1) % totalSlides;
		updateSlider();
	}

	function prevSlide() {
		currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
		updateSlider();
	}

	// Event listeners
	nextBtn.addEventListener('click', nextSlide);
	prevBtn.addEventListener('click', prevSlide);

	// Auto-slide (optional)
	let slideInterval = setInterval(nextSlide, 5000);

	// Pause auto-slide on hover
	slider.parentElement.addEventListener('mouseenter', () => {
		clearInterval(slideInterval);
	});

	slider.parentElement.addEventListener('mouseleave', () => {
		slideInterval = setInterval(nextSlide, 5000);
	});
});