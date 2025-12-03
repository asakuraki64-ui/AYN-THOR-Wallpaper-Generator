document.addEventListener('DOMContentLoaded', function() {
    // Canvas elements
    const topCanvas = document.getElementById('topCanvas');
    const bottomCanvas = document.getElementById('bottomCanvas');
    const combinedCanvas = document.getElementById('combinedCanvas');
    const topCtx = topCanvas.getContext('2d');
    const bottomCtx = bottomCanvas.getContext('2d');
    const combinedCtx = combinedCanvas.getContext('2d');

    // Placeholders
    const topPlaceholder = document.getElementById('topPlaceholder');
    const bottomPlaceholder = document.getElementById('bottomPlaceholder');
    const combinedPlaceholder = document.getElementById('combinedPlaceholder');

    // UI elements
    const imageInput = document.getElementById('imageInput');
    const uploadArea = document.getElementById('uploadArea');
    const resetBtn = document.getElementById('resetBtn');
    const saveTopBtn = document.getElementById('saveTopBtn');
    const saveBottomBtn = document.getElementById('saveBottomBtn');
    // Gap control elements
    const gapInput = document.getElementById('gapInput');

    // Constants
    const TOP_WIDTH = 1920;
    const TOP_HEIGHT = 1080;
    const BOTTOM_WIDTH = 1240;
    const BOTTOM_HEIGHT = 1080;
    const COMBINED_WIDTH = TOP_WIDTH; // 1920 (max width)
    // COMBINED_HEIGHT will be computed dynamically based on gap

    // State for image transformation
    let currentImage = null;
    let currentImageUrl = null;
    let scale = 1.0;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // Touch state for pinch zoom
    let touchStartDistance = 0;
    let touchStartScale = 1.0;
    let touchStartOffsetX = 0;
    let touchStartOffsetY = 0;
    let touchStartCenterX = 0;
    let touchStartCenterY = 0;
    let isPinching = false;

    // Gap height
    let gapHeight = 0;

    // Event Listeners
    imageInput.addEventListener('change', handleImageUpload);
    uploadArea.addEventListener('click', (e) => {
        // If the click is on the file input itself, let the native behavior handle it
        if (e.target === imageInput) return;
        imageInput.click();
    });
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.border = '3px dashed #00adb5';
        uploadArea.style.background = 'rgba(0, 173, 181, 0.1)';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.border = '';
        uploadArea.style.background = '';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.border = '';
        uploadArea.style.background = '';
        if (e.dataTransfer.files.length) {
            // Directly handle the dropped file without assigning to imageInput
            const file = e.dataTransfer.files[0];
            loadImageFile(file);
        }
    });
    resetBtn.addEventListener('click', resetAll);
    saveTopBtn.addEventListener('click', () => saveCanvas(topCanvas, 'top-screen-wallpaper.png'));
    saveBottomBtn.addEventListener('click', () => saveCanvas(bottomCanvas, 'bottom-screen-wallpaper.png'));
    // Gap control events
    gapInput.addEventListener('input', applyGap); // update on input change

    // Mouse interaction for combined canvas
    combinedCanvas.addEventListener('mousedown', startDrag);
    combinedCanvas.addEventListener('mousemove', drag);
    combinedCanvas.addEventListener('mouseup', endDrag);
    combinedCanvas.addEventListener('mouseleave', endDrag);
    combinedCanvas.addEventListener('wheel', zoom);

    // Touch events for mobile
    combinedCanvas.addEventListener('touchstart', touchStart);
    combinedCanvas.addEventListener('touchmove', touchMove);
    combinedCanvas.addEventListener('touchend', touchEnd);

    // Load image from File object
    function loadImageFile(file) {
        if (!file) return;

        // Clean up previous image URL
        if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);

        const imageUrl = URL.createObjectURL(file);
        currentImageUrl = imageUrl;

        const img = new Image();
        img.onload = function() {
            currentImage = img;
            // Reset transformation
            scale = 1.0;
            offsetX = 0;
            offsetY = 0;
            drawAll();
            updatePlaceholders(false);
        };
        img.onerror = function() {
            alert('Failed to load image. Please try another file.');
            resetAll();
        };
        img.src = imageUrl;
    }

    // Handle image upload via file input
    function handleImageUpload() {
        const file = imageInput.files[0];
        loadImageFile(file);
    }

    // Apply gap height
    function applyGap() {
        const value = parseInt(gapInput.value, 10);
        if (isNaN(value) || value < 0 || value > 500) {
            alert('Please enter a valid gap height between 0 and 500 pixels.');
            return;
        }
        gapHeight = value;
        if (currentImage) {
            drawAll();
        }
    }

    // Draw image on all canvases
    function drawAll() {
        if (!currentImage) return;
        drawCombinedCanvas();
        drawSplitCanvases();
    }

    // Draw on combined canvas with current transformation
    function drawCombinedCanvas() {
        const combinedHeight = TOP_HEIGHT + gapHeight + BOTTOM_HEIGHT;
        // Update canvas dimensions
        combinedCanvas.width = COMBINED_WIDTH;
        combinedCanvas.height = combinedHeight;

        combinedCtx.clearRect(0, 0, COMBINED_WIDTH, combinedHeight);

        // Draw background (dark gray)
        combinedCtx.fillStyle = '#111';
        combinedCtx.fillRect(0, 0, COMBINED_WIDTH, combinedHeight);

        // Draw image
        const img = currentImage;
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;

        // Calculate position so image is centered by default, then apply offset
        const x = (COMBINED_WIDTH - scaledWidth) / 2 + offsetX;
        const y = (combinedHeight - scaledHeight) / 2 + offsetY;

        // Draw image
        combinedCtx.drawImage(img, x, y, scaledWidth, scaledHeight);

        // Draw gap area overlay (hidden part between screens)
        if (gapHeight > 0) {
            const gapY = TOP_HEIGHT;
            combinedCtx.fillStyle = 'rgba(255, 50, 50, 0.3)'; // semi-transparent red
            combinedCtx.fillRect(0, gapY, COMBINED_WIDTH, gapHeight);
            
            // Add text label
            combinedCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            combinedCtx.font = 'bold 24px Arial';
            combinedCtx.textAlign = 'center';
            combinedCtx.textBaseline = 'middle';
            combinedCtx.fillText('Hidden Gap Area', COMBINED_WIDTH / 2, gapY + gapHeight / 2);
        }

        // Draw bottom screen crop indication (semi‑transparent gray overlay on sides)
        const bottomY = TOP_HEIGHT + gapHeight;
        const bottomLeftX = (COMBINED_WIDTH - BOTTOM_WIDTH) / 2;
        const sideWidth = bottomLeftX; // 340
        combinedCtx.fillStyle = 'rgba(50, 50, 50, 0.7)';
        // Left side
        combinedCtx.fillRect(0, bottomY, sideWidth, BOTTOM_HEIGHT);
        // Right side
        combinedCtx.fillRect(bottomLeftX + BOTTOM_WIDTH, bottomY, sideWidth, BOTTOM_HEIGHT);

        // Screen borders removed to avoid green border in saved images

        // Show canvas
        combinedCanvas.style.display = 'block';
    }

    // Draw top and bottom canvases from combined canvas
    function drawSplitCanvases() {
        // Clear canvases
        topCtx.clearRect(0, 0, TOP_WIDTH, TOP_HEIGHT);
        bottomCtx.clearRect(0, 0, BOTTOM_WIDTH, BOTTOM_HEIGHT);

        // Draw background
        topCtx.fillStyle = '#111';
        topCtx.fillRect(0, 0, TOP_WIDTH, TOP_HEIGHT);
        bottomCtx.fillStyle = '#111';
        bottomCtx.fillRect(0, 0, BOTTOM_WIDTH, BOTTOM_HEIGHT);

        // Copy from combined canvas
        // Top screen: full width (1920) at top
        topCtx.drawImage(combinedCanvas, 0, 0, TOP_WIDTH, TOP_HEIGHT, 0, 0, TOP_WIDTH, TOP_HEIGHT);
        // Bottom screen: centered horizontally (since bottom screen is narrower)
        const bottomSrcX = (COMBINED_WIDTH - BOTTOM_WIDTH) / 2; // (1920 - 1240) / 2 = 340
        const bottomSrcY = TOP_HEIGHT + gapHeight;
        bottomCtx.drawImage(combinedCanvas, bottomSrcX, bottomSrcY, BOTTOM_WIDTH, BOTTOM_HEIGHT, 0, 0, BOTTOM_WIDTH, BOTTOM_HEIGHT);

        // Show canvases
        topCanvas.style.display = 'block';
        bottomCanvas.style.display = 'block';
    }

    // Update placeholder visibility
    function updatePlaceholders(show) {
        if (show) {
            topPlaceholder.style.display = 'block';
            bottomPlaceholder.style.display = 'block';
            combinedPlaceholder.style.display = 'block';
            topCanvas.style.display = 'none';
            bottomCanvas.style.display = 'none';
            combinedCanvas.style.display = 'none';
        } else {
            topPlaceholder.style.display = 'none';
            bottomPlaceholder.style.display = 'none';
            combinedPlaceholder.style.display = 'none';
            topCanvas.style.display = 'block';
            bottomCanvas.style.display = 'block';
            combinedCanvas.style.display = 'block';
        }
    }

    // Reset everything
    function resetAll() {
        if (currentImageUrl) {
            URL.revokeObjectURL(currentImageUrl);
            currentImageUrl = null;
        }
        currentImage = null;
        imageInput.value = '';
        scale = 1.0;
        offsetX = 0;
        offsetY = 0;
        gapHeight = 0;
        gapInput.value = '0';
        topCtx.clearRect(0, 0, TOP_WIDTH, TOP_HEIGHT);
        bottomCtx.clearRect(0, 0, BOTTOM_WIDTH, BOTTOM_HEIGHT);
        const combinedHeight = TOP_HEIGHT + gapHeight + BOTTOM_HEIGHT;
        combinedCtx.clearRect(0, 0, COMBINED_WIDTH, combinedHeight);
        updatePlaceholders(true);
    }

    // Save canvas as PNG
    function saveCanvas(canvas, filename) {
        if (!currentImage) {
            alert('Please upload an image first.');
            return;
        }
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Drag and zoom functions
    function startDrag(e) {
        if (!currentImage) return;
        isDragging = true;
        lastMouseX = e.clientX || e.touches[0].clientX;
        lastMouseY = e.clientY || e.touches[0].clientY;
        combinedCanvas.style.cursor = 'grabbing';
        e.preventDefault();
    }

    function drag(e) {
        if (!isDragging || !currentImage) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        if (!clientX || !clientY) return;

        const deltaX = clientX - lastMouseX;
        const deltaY = clientY - lastMouseY;
        offsetX += deltaX;
        offsetY += deltaY;
        lastMouseX = clientX;
        lastMouseY = clientY;
        drawAll();
        e.preventDefault();
    }

    function endDrag() {
        isDragging = false;
        combinedCanvas.style.cursor = 'grab';
    }

    function zoom(e) {
        if (!currentImage) return;
        e.preventDefault();
        const zoomFactor = 0.1;
        const rect = combinedCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Dynamic combined height based on gap
        const combinedHeight = TOP_HEIGHT + gapHeight + BOTTOM_HEIGHT;

        // Calculate image point before scaling
        const imgX = (mouseX - (COMBINED_WIDTH - currentImage.width * scale) / 2 - offsetX) / scale;
        const imgY = (mouseY - (combinedHeight - currentImage.height * scale) / 2 - offsetY) / scale;

        if (e.deltaY < 0) {
            // Zoom in
            scale *= 1 + zoomFactor;
        } else {
            // Zoom out
            scale *= 1 - zoomFactor;
        }
        // Clamp scale
        scale = Math.max(0.1, Math.min(scale, 10));

        // Adjust offset so the point under mouse stays fixed
        const newX = (COMBINED_WIDTH - currentImage.width * scale) / 2 + offsetX;
        const newY = (combinedHeight - currentImage.height * scale) / 2 + offsetY;
        offsetX += mouseX - newX - imgX * scale;
        offsetY += mouseY - newY - imgY * scale;

        drawAll();
    }

    // Helper function to zoom at a specific point (similar to mouse wheel zoom)
    function zoomAt(centerX, centerY, scaleFactor) {
        if (!currentImage) return;
        const rect = combinedCanvas.getBoundingClientRect();
        const mouseX = centerX - rect.left;
        const mouseY = centerY - rect.top;
        const combinedHeight = TOP_HEIGHT + gapHeight + BOTTOM_HEIGHT;

        // Image point before scaling
        const imgX = (mouseX - (COMBINED_WIDTH - currentImage.width * scale) / 2 - offsetX) / scale;
        const imgY = (mouseY - (combinedHeight - currentImage.height * scale) / 2 - offsetY) / scale;

        // Apply scale factor
        scale *= scaleFactor;
        // Clamp scale
        scale = Math.max(0.1, Math.min(scale, 10));

        // Adjust offset so the point under mouse stays fixed
        const newX = (COMBINED_WIDTH - currentImage.width * scale) / 2 + offsetX;
        const newY = (combinedHeight - currentImage.height * scale) / 2 + offsetY;
        offsetX += mouseX - newX - imgX * scale;
        offsetY += mouseY - newY - imgY * scale;

        drawAll();
    }

    // Touch handlers
    function touchStart(e) {
        e.preventDefault();
        if (!currentImage) return;
        
        if (e.touches.length === 1) {
            // Single touch: start dragging
            startDrag(e);
            isPinching = false;
        } else if (e.touches.length === 2) {
            // Two touches: start pinch zoom
            isDragging = false;
            isPinching = true;
            
            // Calculate initial distance and center
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            touchStartDistance = getDistance(t1, t2);
            touchStartScale = scale;
            touchStartOffsetX = offsetX;
            touchStartOffsetY = offsetY;
            
            // Center between the two touches in canvas coordinates
            const rect = combinedCanvas.getBoundingClientRect();
            touchStartCenterX = (t1.clientX + t2.clientX) / 2 - rect.left;
            touchStartCenterY = (t1.clientY + t2.clientY) / 2 - rect.top;
        }
    }

    function touchMove(e) {
        e.preventDefault();
        if (!currentImage) return;
        
        if (e.touches.length === 1 && isDragging && !isPinching) {
            // Single touch drag
            drag(e);
        } else if (e.touches.length === 2 && isPinching) {
            // Pinch zoom
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const currentDistance = getDistance(t1, t2);
            if (touchStartDistance === 0) return;
            
            // Calculate scale factor (how much the distance changed)
            const scaleFactor = currentDistance / touchStartDistance;
            // Use the current center as the zoom anchor
            const rect = combinedCanvas.getBoundingClientRect();
            const currentCenterX = (t1.clientX + t2.clientX) / 2;
            const currentCenterY = (t1.clientY + t2.clientY) / 2;
            
            // Apply zoom at the current center
            zoomAt(currentCenterX, currentCenterY, scaleFactor);
            
            // Update start distance and scale for the next move to be smooth
            touchStartDistance = currentDistance;
            touchStartScale = scale;
            touchStartOffsetX = offsetX;
            touchStartOffsetY = offsetY;
            touchStartCenterX = currentCenterX - rect.left;
            touchStartCenterY = currentCenterY - rect.top;
        }
    }

    function touchEnd(e) {
        e.preventDefault();
        if (e.touches.length === 0) {
            // No touches left
            isDragging = false;
            isPinching = false;
            endDrag();
        } else if (e.touches.length === 1) {
            // One touch left, switch to dragging if not pinching
            if (isPinching) {
                isPinching = false;
                // Start drag with the remaining touch
                startDrag(e);
            }
        }
    }

    // Helper functions for touch
    function getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Initialize placeholders
    updatePlaceholders(true);
});
