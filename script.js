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
    const BOTTOM_CONTENT_WIDTH = 1240; // Actual content width for bottom screen
    const BOTTOM_CONTENT_HEIGHT = 1080;
    const BOTTOM_OUTPUT_WIDTH = 1920; // Output width with black borders
    const BOTTOM_OUTPUT_HEIGHT = 1080;
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
        const combinedHeight = TOP_HEIGHT + gapHeight + BOTTOM_CONTENT_HEIGHT;
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
        const bottomLeftX = (COMBINED_WIDTH - BOTTOM_CONTENT_WIDTH) / 2;
        const sideWidth = bottomLeftX; // 340
        combinedCtx.fillStyle = 'rgba(50, 50, 50, 0.7)';
        // Left side
        combinedCtx.fillRect(0, bottomY, sideWidth, BOTTOM_CONTENT_HEIGHT);
        // Right side
        combinedCtx.fillRect(bottomLeftX + BOTTOM_CONTENT_WIDTH, bottomY, sideWidth, BOTTOM_CONTENT_HEIGHT);

        // Screen borders removed to avoid green border in saved images

        // Show canvas
        combinedCanvas.style.display = 'block';
    }

    // Draw top and bottom canvases from combined canvas
    function drawSplitCanvases() {
        // Clear canvases
        topCtx.clearRect(0, 0, TOP_WIDTH, TOP_HEIGHT);
        bottomCtx.clearRect(0, 0, BOTTOM_OUTPUT_WIDTH, BOTTOM_OUTPUT_HEIGHT);

        // Draw background (black for bottom screen to create borders)
        topCtx.fillStyle = '#111';
        topCtx.fillRect(0, 0, TOP_WIDTH, TOP_HEIGHT);
        bottomCtx.fillStyle = '#000'; // Pure black for borders
        bottomCtx.fillRect(0, 0, BOTTOM_OUTPUT_WIDTH, BOTTOM_OUTPUT_HEIGHT);

        // Copy from combined canvas
        // Top screen: full width (1920) at top
        topCtx.drawImage(combinedCanvas, 0, 0, TOP_WIDTH, TOP_HEIGHT, 0, 0, TOP_WIDTH, TOP_HEIGHT);
        // Bottom screen: draw content centered on 1920x1080 canvas
        const bottomSrcX = (COMBINED_WIDTH - BOTTOM_CONTENT_WIDTH) / 2; // (1920 - 1240) / 2 = 340
        const bottomSrcY = TOP_HEIGHT + gapHeight;
        const bottomDstX = (BOTTOM_OUTPUT_WIDTH - BOTTOM_CONTENT_WIDTH) / 2; // Center the content
        bottomCtx.drawImage(combinedCanvas, bottomSrcX, bottomSrcY, BOTTOM_CONTENT_WIDTH, BOTTOM_CONTENT_HEIGHT, 
                           bottomDstX, 0, BOTTOM_CONTENT_WIDTH, BOTTOM_CONTENT_HEIGHT);

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
        bottomCtx.clearRect(0, 0, BOTTOM_OUTPUT_WIDTH, BOTTOM_OUTPUT_HEIGHT);
        const combinedHeight = TOP_HEIGHT + gapHeight + BOTTOM_CONTENT_HEIGHT;
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
        const combinedHeight = TOP_HEIGHT + gapHeight + BOTTOM_CONTENT_HEIGHT;

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

    // Touch handlers
    let initialPinchDistance = null;
    let initialScale = 1.0;
    let initialOffsetX = 0;
    let initialOffsetY = 0;
    let isPinching = false;

    function touchStart(e) {
        if (e.touches.length === 1) {
            startDrag(e);
            isPinching = false;
        } else if (e.touches.length === 2) {
            // Start pinch zoom
            e.preventDefault();
            isPinching = true;
            isDragging = false;
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            initialPinchDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            initialScale = scale;
            initialOffsetX = offsetX;
            initialOffsetY = offsetY;
            // Calculate center point between two touches
            const rect = combinedCanvas.getBoundingClientRect();
            const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
            const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
            // Store center for later offset adjustment
            combinedCanvas.dataset.pinchCenterX = centerX;
            combinedCanvas.dataset.pinchCenterY = centerY;
        }
    }

    function touchMove(e) {
        if (isPinching && e.touches.length === 2) {
            e.preventDefault();
            if (!currentImage) return;
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            if (initialPinchDistance !== null && currentDistance > 0) {
                const ratio = currentDistance / initialPinchDistance;
                const newScale = initialScale * ratio;
                // Clamp scale
                scale = Math.max(0.1, Math.min(newScale, 10));
                // Adjust offset to keep the center point fixed
                const centerX = parseFloat(combinedCanvas.dataset.pinchCenterX);
                const centerY = parseFloat(combinedCanvas.dataset.pinchCenterY);
                const combinedHeight = TOP_HEIGHT + gapHeight + BOTTOM_CONTENT_HEIGHT;
                // Calculate image point before scaling
                const imgX = (centerX - (COMBINED_WIDTH - currentImage.width * initialScale) / 2 - initialOffsetX) / initialScale;
                const imgY = (centerY - (combinedHeight - currentImage.height * initialScale) / 2 - initialOffsetY) / initialScale;
                // New offset to keep the same point under the center
                const newX = (COMBINED_WIDTH - currentImage.width * scale) / 2 + offsetX;
                const newY = (combinedHeight - currentImage.height * scale) / 2 + offsetY;
                offsetX = initialOffsetX + (centerX - newX - imgX * scale);
                offsetY = initialOffsetY + (centerY - newY - imgY * scale);
                drawAll();
            }
        } else if (e.touches.length === 1 && !isPinching) {
            drag(e);
        }
    }

    function touchEnd(e) {
        if (e.touches.length === 0) {
            // No touches left
            isPinching = false;
            initialPinchDistance = null;
            endDrag();
        } else if (e.touches.length === 1) {
            // One touch left, switch to dragging
            isPinching = false;
            initialPinchDistance = null;
            // Update lastMouseX/Y for continuous drag
            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;
        }
        // If there are still two touches, do nothing (still pinching)
    }

    // Initialize placeholders
    updatePlaceholders(true);
});
