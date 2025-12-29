(function() {
  'use strict';

  // Extract app ID from URL
  function extractAppId() {
    const url = window.location.href;
    let appId = null;
    let platform = null;

    // iOS App Store: apps.apple.com/*/app/*/id{app_id}
    const iosMatch = url.match(/apps\.apple\.com\/[^\/]+\/app\/[^\/]+\/id(\d+)/);
    if (iosMatch) {
      appId = iosMatch[1];
      platform = 'ios';
    }

    // Android Play Store: play.google.com/store/apps/details?id={package_name}
    const androidMatch = url.match(/play\.google\.com\/store\/apps\/details\?id=([^&]+)/);
    if (androidMatch) {
      appId = decodeURIComponent(androidMatch[1]);
      platform = 'android';
    }

    return { appId, platform };
  }

  // Format date string
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  }

  // Format number with commas
  function formatNumber(num) {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString();
  }

  // Format categories
  function formatCategories(categories, platform) {
    if (!categories || categories.length === 0) return 'N/A';
    
    if (platform === 'android') {
      // Android categories are strings like "travel_and_local"
      return categories.map(cat => {
        // Convert "travel_and_local" to "Travel & Local"
        return cat.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' & ');
      }).join(', ');
    } else {
      // iOS categories are numeric codes
      return categories.join(', ');
    }
  }

  // Load saved popup position
  function loadPopupPosition() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['popupPosition'], (result) => {
        if (result.popupPosition) {
          resolve(result.popupPosition);
        } else {
          resolve({ top: 20, right: 20 }); // Default position
        }
      });
    });
  }

  // Save popup position
  function savePopupPosition(position) {
    chrome.storage.local.set({ popupPosition: position });
  }

  // Setup drag functionality
  function setupDrag(popup) {
    const header = popup.querySelector('.st-header');
    let isDragging = false;
    let hasMoved = false;
    let startX, startY, initialTop, initialRight;
    let dragOccurred = false;

    const handleMouseDown = (e) => {
      // Don't start drag if clicking on toggle icon
      if (e.target.classList.contains('st-toggle-icon')) {
        return;
      }

      isDragging = true;
      hasMoved = false;
      dragOccurred = false;
      popup.classList.add('st-dragging');
      
      const rect = popup.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      initialTop = rect.top;
      initialRight = window.innerWidth - rect.right;

      e.preventDefault();
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // Check if mouse has moved significantly (more than 3px)
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMoved = true;
        dragOccurred = true;
      }

      const newTop = initialTop + deltaY;
      const newRight = initialRight - deltaX;

      // Constrain to viewport
      const maxTop = window.innerHeight - popup.offsetHeight;
      const maxRight = window.innerWidth - popup.offsetWidth;
      
      const constrainedTop = Math.max(0, Math.min(newTop, maxTop));
      const constrainedRight = Math.max(0, Math.min(newRight, maxRight));

      popup.style.top = `${constrainedTop}px`;
      popup.style.right = `${constrainedRight}px`;
      popup.style.left = 'auto';
      popup.style.bottom = 'auto';
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      
      const wasDragging = hasMoved;
      isDragging = false;
      popup.classList.remove('st-dragging');

      if (wasDragging) {
        // Save position if we actually dragged
        const rect = popup.getBoundingClientRect();
        const position = {
          top: rect.top,
          right: window.innerWidth - rect.right
        };
        savePopupPosition(position);
      }

      // Reset dragOccurred after a short delay to allow click handler to check it
      setTimeout(() => {
        dragOccurred = false;
      }, 100);
    };

    header.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Cleanup on popup removal
    const observer = new MutationObserver(() => {
      if (!document.body.contains(popup)) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Return function to check if drag occurred
    return () => dragOccurred;
  }

  // Create popup element
  async function createPopup() {
    const popup = document.createElement('div');
    popup.id = 'sensor-tower-popup';
    popup.className = 'st-collapsed';
    popup.innerHTML = `
      <div class="st-header">
        <span class="st-drag-handle">⋮⋮</span>
        <span>Sensor Tower Metrics</span>
        <span class="st-toggle-icon">▼</span>
      </div>
      <div class="st-content">
        <div class="st-loading">Loading...</div>
      </div>
    `;
    
    // Load and apply saved position
    const savedPosition = await loadPopupPosition();
    popup.style.top = `${savedPosition.top}px`;
    popup.style.right = `${savedPosition.right}px`;
    
    // Setup drag functionality
    const checkDragOccurred = setupDrag(popup);
    
    // Add toggle functionality
    const header = popup.querySelector('.st-header');
    const toggleIcon = popup.querySelector('.st-toggle-icon');
    
    // Toggle on header click (but not if we just dragged)
    header.addEventListener('click', (e) => {
      // Don't toggle if clicking on toggle icon (it has its own handler)
      if (e.target.classList.contains('st-toggle-icon')) {
        return;
      }
      // Don't toggle if we just dragged
      if (checkDragOccurred()) {
        return;
      }
      popup.classList.toggle('st-collapsed');
      toggleIcon.textContent = popup.classList.contains('st-collapsed') ? '▼' : '▲';
    });
    
    // Toggle icon click
    toggleIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      popup.classList.toggle('st-collapsed');
      toggleIcon.textContent = popup.classList.contains('st-collapsed') ? '▼' : '▲';
    });
    
    document.body.appendChild(popup);
    return popup;
  }

  // Update popup with data
  function updatePopup(data) {
    const popup = document.getElementById('sensor-tower-popup');
    if (!popup) return;

    if (!data || !data.apps || data.apps.length === 0) {
      popup.querySelector('.st-content').innerHTML = `
        <div class="st-error">No data available</div>
      `;
      return;
    }

    const app = data.apps[0];
    const releaseDate = formatDate(app.release_date);
    const updatedDate = formatDate(app.updated_date);
    const downloads = app.humanized_worldwide_last_month_downloads?.string || 'N/A';
    const revenue = app.humanized_worldwide_last_month_revenue?.string || 'N/A';
    const ratings = formatNumber(app.global_rating_count);
    const websiteUrl = app.website_url || null;

    popup.querySelector('.st-content').innerHTML = `
      <div class="st-row">
        <span class="st-label">Release Date:</span>
        <span class="st-value">${releaseDate}</span>
      </div>
      <div class="st-row">
        <span class="st-label">Last Updated:</span>
        <span class="st-value">${updatedDate}</span>
      </div>
      <div class="st-row">
        <span class="st-label">Downloads (last month):</span>
        <span class="st-value">${downloads}</span>
      </div>
      <div class="st-row">
        <span class="st-label">Revenue (last month):</span>
        <span class="st-value">${revenue}</span>
      </div>
      <div class="st-row">
        <span class="st-label">Total Ratings:</span>
        <span class="st-value">${ratings}</span>
      </div>
      <div class="st-row">
        <span class="st-label">Website:</span>
        <span class="st-value">
          ${websiteUrl ? `<a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" class="st-link">${websiteUrl}</a>` : 'N/A'}
        </span>
      </div>
    `;
  }

  // Show error in popup
  function showError(message) {
    const popup = document.getElementById('sensor-tower-popup');
    if (!popup) return;
    popup.querySelector('.st-content').innerHTML = `
      <div class="st-error">Error: ${message}</div>
    `;
  }

  // Fetch data from Sensor Tower API via background service worker
  function fetchAppData(appId, platform) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'fetchAppData',
          appId: appId,
          platform: platform
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || 'Failed to fetch data'));
          }
        }
      );
    });
  }

  // Main function
  async function init() {
    // Check if popup already exists
    if (document.getElementById('sensor-tower-popup')) {
      return;
    }

    const { appId, platform } = extractAppId();
    
    if (!appId || !platform) {
      // Not on a valid store page
      return;
    }

    // Create popup
    await createPopup();

    // Fetch and display data
    fetchAppData(appId, platform)
      .then(data => {
        updatePopup(data);
      })
      .catch(error => {
        showError(error.message || 'Failed to fetch data');
      });
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-run on navigation (for SPAs)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      // Remove existing popup
      const existingPopup = document.getElementById('sensor-tower-popup');
      if (existingPopup) {
        existingPopup.remove();
      }
      // Reinitialize
      setTimeout(init, 500);
    }
  }).observe(document, { subtree: true, childList: true });
})();

