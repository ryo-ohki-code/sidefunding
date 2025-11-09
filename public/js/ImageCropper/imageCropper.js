
// select image area
const mainOverlay = document.getElementById('cropper-overlay');
const imageInput = document.getElementById('avatar-input'); // Set your image input id here
const imageContainer = document.getElementById('image-container');
const previewContainer = document.getElementById('preview-container');
const imageDisplay = document.getElementById('image-display');
const overlay = document.getElementById('crop-overlay');
const previewCanvas = document.getElementById('preview-canvas');
const previewCtx = previewCanvas.getContext('2d');
const cropBtn = document.getElementById('crop-btn');
const resetBtn = document.getElementById('reset-btn');
const cancelBtn = document.getElementById('cancel-btn');
const validateBtn = document.getElementById('validate-btn');


let originalImage = null;
let isDragging = false;
let isResizing = false;
let startX, startY, startLeft, startTop;
let overlayStartX, overlayStartY;
let overlayStartWidth, overlayStartHeight;
let resizeDirection = '';

// Initialize overlay
overlay.style.display = 'none';
overlay.style.width = '200px';
overlay.style.height = '200px';
overlay.style.left = '50px';
overlay.style.top = '50px';

// Set minumal selection are size
const minSizeW = 50;
const minSizeH = 50;



// Touch screen event handlers
function handleTouchStart(e) {
    if (e.touches.length === 1) {
        if (e.target.classList.contains('resize-handle')) {
            isResizing = true;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartWidth = parseInt(overlay.style.width, 10);
            touchStartHeight = parseInt(overlay.style.height, 10);

            // Set the resize direction based on which handle was clicked
            if (e.target.classList.contains('bottom-right')) {
                resizeDirection = 'bottom-right';
            } else if (e.target.classList.contains('top-right')) {
                resizeDirection = 'top-right';
            } else if (e.target.classList.contains('bottom-left')) {
                resizeDirection = 'bottom-left';
            } else {
                resizeDirection = 'bottom-right'; // default
            }
        } else if (e.target.classList.contains('move-handle')) {
            isDragging = true;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        } else if (e.target === overlay) {
            isDragging = true;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
        e.preventDefault();
    } else if (e.touches.length === 2) {
        // Handle pinch-to-zoom for resizing
        isResizing = true;
        // const touch1 = e.touches[0];
        // const touch2 = e.touches[1];
        // const distance = Math.sqrt(
        //     Math.pow(touch2.clientX - touch1.clientX, 2) +
        //     Math.pow(touch2.clientY - touch1.clientY, 2)
        // );
        touchStartWidth = parseInt(overlay.style.width, 10);
        touchStartHeight = parseInt(overlay.style.height, 10);
        e.preventDefault();
    }
}


function handleTouchMove(e) {
    if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - touchStartX;
        const deltaY = e.touches[0].clientY - touchStartY;

        let currentLeft = parseInt(overlay.style.left, 10);
        let currentTop = parseInt(overlay.style.top, 10);

        // Dragging boundary
        currentLeft = Math.max(0, Math.min(currentLeft, imageContainer.offsetWidth - parseInt(overlay.style.width) - 10));
        currentTop = Math.max(0, Math.min(currentTop, imageContainer.offsetHeight - parseInt(overlay.style.height) - 10));

        overlay.style.left = (currentLeft + deltaX) + 'px';
        overlay.style.top = (currentTop + deltaY) + 'px';

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        e.preventDefault();
    } else if (isResizing && e.touches.length === 2) {
        // const touch1 = e.touches[0];
        // const touch2 = e.touches[1];
        // const distance = Math.sqrt(
        //     Math.pow(touch2.clientX - touch1.clientX, 2) +
        //     Math.pow(touch2.clientY - touch1.clientY, 2)
        // );

        // const newWidth = Math.max(minSizeW, touchStartWidth + distance - minSizeW);
        // const newHeight = Math.max(minSizeH, touchStartHeight + distance - minSizeH);

        // overlay.style.width = newWidth + 'px';
        // overlay.style.height = newHeight + 'px';

        // console.log("1-", deltaX, deltaY, newWidth, newHeight);

        e.preventDefault();
    } else if (isResizing && e.touches.length === 1) {
        const containerWidth = imageContainer.offsetWidth;
        const containerHeight = imageContainer.offsetHeight;

        const deltaX = e.touches[0].clientX - touchStartX;
        const deltaY = e.touches[0].clientY - touchStartY;

        const currentLeft = parseInt(overlay.style.left, 10);
        const currentTop = parseInt(overlay.style.top, 10);

        const maxWidth = containerWidth - currentLeft -10;
        const maxHeight = containerHeight - currentTop -10;
        const maxAllowedSize = Math.min(maxWidth, maxHeight);

        let newWidth;
        let newHeight;

        let minSizeWidth = minSizeW;
        let minSizeHeight = minSizeH;

        if (resizeDirection === 'bottom-right') {
            newWidth = Math.max(minSizeWidth, touchStartWidth + deltaX);
            newHeight = Math.max(minSizeHeight, touchStartHeight + deltaY);
        }

        if (resizeDirection === 'bottom-left') {
            newWidth = Math.max(minSizeWidth, touchStartWidth - deltaX);
            newHeight = Math.max(minSizeHeight, touchStartHeight + deltaY);
        }
 
        if (resizeDirection === 'top-right') {
            newWidth = Math.max(minSizeWidth, touchStartWidth + deltaX);
            newHeight = Math.max(minSizeHeight, touchStartHeight - deltaY);
        }

        newWidth = Math.min(newWidth, maxWidth);
        newHeight = Math.min(newHeight, maxHeight);

        const finalSize = Math.min(newWidth, newHeight, maxAllowedSize);

        // Square Ratio use 'finalSize' else use 'newWidth and newHeight'
        newWidth = finalSize;
        newHeight = finalSize;

        overlay.style.width = newWidth + 'px';
        overlay.style.height = newHeight + 'px';

        e.preventDefault();
    }
}

function handleTouchEnd() {
    isDragging = false;
    isResizing = false;
}

// Move handle event handlers
function handleMoveStart(e) {
    if (e.type === 'mousedown') {
        // isDragging = true;
        // startX = e.clientX;
        // startY = e.clientY;
    } else if (e.type === 'touchstart') {
        isDragging = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
}

function handleMoveMove(e) {
    if (isDragging) {
        if (e.type === 'mousemove') {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            const currentLeft = parseInt(overlay.style.left, 10);
            const currentTop = parseInt(overlay.style.top, 10);

            overlay.style.left = (currentLeft + deltaX) + 'px';
            overlay.style.top = (currentTop + deltaY) + 'px';

            startX = e.clientX;
            startY = e.clientY;
        } else if (e.type === 'touchmove') {
            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;

            const currentLeft = parseInt(overlay.style.left, 10);
            const currentTop = parseInt(overlay.style.top, 10);

            overlay.style.left = (currentLeft + deltaX) + 'px';
            overlay.style.top = (currentTop + deltaY) + 'px';

            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    }
}

function handleMoveEnd() {
    isDragging = false;
}

overlay.addEventListener('touchstart', handleTouchStart);
overlay.addEventListener('touchmove', handleTouchMove);
overlay.addEventListener('touchend', handleTouchEnd);

const moveHandle = document.querySelector('.move-handle');
moveHandle.addEventListener('touchstart', handleMoveStart);
moveHandle.addEventListener('touchmove', handleMoveMove);
moveHandle.addEventListener('touchend', handleMoveEnd);








// handle mouse
function startDrag(e) {
    if (e.target.classList.contains('move-handle')) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        overlayStartX = parseInt(overlay.style.left);
        overlayStartY = parseInt(overlay.style.top);

        e.preventDefault();
    } else if (e.target.classList.contains('resize-handle')) {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;

        startLeft = imageContainer.offsetLeft;
        startTop = imageContainer.offsetTop;

        overlayStartWidth = parseInt(overlay.style.width);
        overlayStartHeight = parseInt(overlay.style.height);
        overlayStartX = parseInt(overlay.style.left);
        overlayStartY = parseInt(overlay.style.top);

        // Set the resize direction based on which handle was clicked
        if (e.target.classList.contains('bottom-right')) {
            resizeDirection = 'bottom-right';
        } else if (e.target.classList.contains('top-right')) {
            resizeDirection = 'top-right';
        } else if (e.target.classList.contains('bottom-left')) {
            resizeDirection = 'bottom-left';
        } else {
            resizeDirection = 'bottom-right'; // default
        }

        e.preventDefault();
    }
}

function drag(e) {
    if (isDragging) {
        // const containerRect = imageContainer.getBoundingClientRect();
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        let newX = overlayStartX + deltaX;
        let newY = overlayStartY + deltaY;

        // Keep within bounds
        const containerWidth = imageContainer.offsetWidth;
        const containerHeight = imageContainer.offsetHeight;

        newX = Math.max(0, Math.min(newX, containerWidth - parseInt(overlay.style.width) - 6));
        newY = Math.max(0, Math.min(newY, containerHeight - parseInt(overlay.style.height) - 6));

        overlay.style.left = newX + 'px';
        overlay.style.top = newY + 'px';
    } else if (isResizing) {
        const containerWidth = imageContainer.offsetWidth;
        const containerHeight = imageContainer.offsetHeight;

        const deltaX = e.clientX - startX;
        let deltaY = e.clientY - startY;

        let newWidth = overlayStartWidth;
        let newHeight = overlayStartHeight;
        let newX = overlayStartX;
        let newY = overlayStartY;

        // let newX = startLeft;
        // let newY = startTop;

        const minW = minSizeW;
        const minH = minSizeH;

        // Apply changes based on direction
        if (resizeDirection === 'bottom-right') {
            newWidth = Math.max(minW, overlayStartWidth + deltaX);
            newHeight = Math.max(minH, overlayStartHeight + deltaY);
        }

        // Apply changes based on direction
        if (resizeDirection === 'bottom-left') {
            newWidth = Math.max(minW, overlayStartWidth - deltaX);
            newHeight = Math.max(minH, overlayStartHeight + deltaY);
        }
        if (resizeDirection === 'top-right') {
            newWidth = Math.max(minW, overlayStartWidth + deltaX);
            newHeight = Math.max(minH, overlayStartHeight - deltaY);

            // newY = newY + deltaY;

            // if(newY > containerHeight) newY = containerHeight;
            // if(deltaY > ???) return;
            // if (newY > startTop) newY = (containerHeight - startTop ) + (overlayStartHeight + deltaY);//+ (startTop + deltaY); // here need good bondary to fix 
        }

        // Set your maximum size limit
        const maxSize = 500;


        // Ensure we don't exceed container boundaries
        const availableWidth = containerWidth - newX - 6;
        const availableHeight = containerHeight - newY - 6;


        // Check if we're going to exceed container bounds
        // const maxAllowedSize = Math.min(availableWidth, availableHeight);

        // Ensure final size doesn't exceed available space
        // const finalW = Math.min(newWidth, availableWidth, maxSize);
        // const finalH = Math.min(newHeight, availableHeight, maxSize);

        const finalSquare = Math.min(newWidth, availableWidth, availableHeight, maxSize)

        newWidth = finalSquare;
        newHeight = finalSquare;


        overlay.style.width = newWidth + 'px';
        overlay.style.height = newHeight + 'px';

        // Boundary
        // if (newX < 0) newX = 0;
        // if (newY < 0) newY = 0;
        // overlay.style.left = newX + 'px';
        // overlay.style.top = newY + 'px';
    }
}

function stopDrag() {
    isDragging = false;
    isResizing = false;
    resizeDirection = '';
}

let isNew = false;

imageInput.addEventListener('change', function (e) {
    if (!isNew && this.files && this.files[0]) {

        const reader = new FileReader();

        reader.onload = function (event) {
            // Show overlay when user selects a new image
            mainOverlay.classList.remove('hidden');

            originalImage = new Image();
            originalImage.onload = function () {
                // Set display image
                imageDisplay.src = event.target.result;

                // Adapt size if needed
                if (originalImage.height > originalImage.width) {
                    // reduce to 80% of screen height
                    const screenHeight = window.innerHeight;
                    const maxImageHeight = screenHeight * 0.8;

                    const aspectRatio = originalImage.width / originalImage.height;

                    // Apply the resize to imageDisplay
                    imageDisplay.style.width = '40%';
                    imageDisplay.style.height = 'auto';

                    if (0.5 > aspectRatio < 0.8) {
                        imageContainer.style.width = '35%';
                        imageDisplay.style.width = '100%';
                        imageDisplay.style.height = 'auto';
                    }
                    else if (aspectRatio < 0.5) {
                        imageDisplay.style.width = '20%';
                        imageDisplay.style.height = 'auto';
                    }

                } else {
                    imageDisplay.style.width = '';
                    imageDisplay.style.height = '';
                }

                overlay.style.display = 'block';
                resetPosition();

                // Add event listeners for dragging
                overlay.addEventListener('mousedown', startDrag);

            };
            originalImage.src = event.target.result;
        };

        reader.readAsDataURL(this.files[0]);
    } else {
        isNew = false;
    }
});

// Add event listeners
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', stopDrag);




// Initialize with resize handles
window.addEventListener('load', function () {
    const handles = document.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
        handle.addEventListener('mousedown', startDrag);
    });

    // Make sure the move handle is also clickable
    const moveHandle = document.querySelector('.move-handle');
    if (moveHandle) {
        moveHandle.addEventListener('mousedown', startDrag);
    }
});











// buttons
cropBtn.addEventListener('click', function () {
    if (!originalImage) return;

    // Get the position and size of the overlay relative to image
    // const containerRect = imageContainer.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const imageRect = imageDisplay.getBoundingClientRect();

    // Calculate the actual cropping area in original image coordinates
    const scaleX = originalImage.naturalWidth / imageDisplay.offsetWidth;
    const scaleY = originalImage.naturalHeight / imageDisplay.offsetHeight;

    const cropX = (overlayRect.left - imageRect.left) * scaleX;
    const cropY = (overlayRect.top - imageRect.top) * scaleY;
    const cropWidth = overlayRect.width * scaleX;
    const cropHeight = overlayRect.height * scaleY;

    // Create a canvas for the cropped result
    previewCanvas.width = 300;
    previewCanvas.height = 300;

    // Draw the cropped area and scale it to 300x300
    previewCtx.drawImage(
        originalImage,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, 300, 300
    );
    imageContainer.classList.add('hidden');
    previewCanvas.classList.remove('hidden');
    validateBtn.classList.remove('hidden');
    cropBtn.classList.add('hidden')
    resetBtn.classList.remove('hidden');
});


resetBtn.addEventListener('click', function () {
    if (!originalImage) return;

    stopDrag();

    // Reset display
    imageContainer.classList.remove('hidden');
    previewCanvas.classList.add('hidden');
    validateBtn.classList.add('hidden');
    cropBtn.classList.remove('hidden')
    resetBtn.classList.add('hidden');

    resetPosition();
});

function resetPosition() {
    // Reset position
    const containerWidth = imageContainer.offsetWidth;
    const containerHeight = imageContainer.offsetHeight;

    let initialSize = Math.min(containerWidth * 0.5, containerHeight * 0.5);
    initialSize = Math.min(initialSize, 300);

    overlay.style.width = initialSize + 'px';
    overlay.style.height = initialSize + 'px';
    overlay.style.left = (containerWidth - initialSize) / 2 + 'px';
    overlay.style.top = (containerHeight - initialSize) / 2 + 'px';

    // Clear preview
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
}


cancelBtn.addEventListener('click', function () {
    isNew = false;
    imageInput.value = '';

    // Hide overlay and reset
    resetDisplay();
});


validateBtn.addEventListener('click', function () {
    isNew = true;

    // Hide overlay and reset
    resetDisplay();

    if (!originalImage) return;

    // Get the original file extension for format preservation
    let ext = 'png'; // default
    let mimeType = 'image/png';

    if (imageInput && imageInput.files.length > 0) {
        const originalFile = imageInput.files[0];
        const originalExt = originalFile.name.split('.').pop().toLowerCase();

        // Map common extensions to MIME types
        const extMap = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp'
        };

        ext = originalExt;
        mimeType = extMap[originalExt] || 'image/png';
    }

    // Convert canvas to appropriate format based on original file
    const dataUrl = previewCanvas.toDataURL(mimeType);

    fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
            // Create filename 
            let originalFilename = 'cropped-image.png';
            if (imageInput && imageInput.files.length > 0) {
                const originalFile = imageInput.files[0];
                const ext = originalFile.name.split('.').pop();
                const nameWithoutExt = originalFile.name.split('.').slice(0, -1).join('.');

                if (!nameWithoutExt.startsWith('cropped-')) {
                    originalFilename = `cropped-${nameWithoutExt}.${ext}`;
                } else {
                    originalFilename = `${nameWithoutExt}.${ext}`;
                }
            }

            // Create new file
            const file = new File([blob], originalFilename, {
                type: mimeType,
                lastModified: Date.now()
            });

            // Set the file directly (simpler approach)
            if (imageInput) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                imageInput.files = dataTransfer.files;

                // Trigger change event
                imageInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
});






// display
function resetDisplay() {
    if (imageContainer.classList.contains('hidden')) imageContainer.classList.remove('hidden');
    if (!previewCanvas.classList.contains('hidden')) previewCanvas.classList.add('hidden');
    if (!validateBtn.classList.contains('hidden')) validateBtn.classList.add('hidden');
    if (cropBtn.classList.contains('hidden')) cropBtn.classList.remove('hidden')
    if (!resetBtn.classList.contains('hidden')) resetBtn.classList.add('hidden');
    hideOverlay();
}


function hideOverlay() {
    mainOverlay.classList.add('fade-out');

    // Remove the overlay after animation completes
    setTimeout(() => {
        mainOverlay.classList.remove('fade-out'); // or overlay.style.display = 'none';
        mainOverlay.classList.add('hidden');
    }, 300);
}