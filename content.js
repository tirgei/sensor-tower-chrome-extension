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

  // Create popup element
  function createPopup() {
    const popup = document.createElement('div');
    popup.id = 'sensor-tower-popup';
    popup.className = 'st-collapsed';
    popup.innerHTML = `
      <div class="st-header">
        <span>Sensor Tower Metrics</span>
        <span class="st-toggle-icon">▼</span>
      </div>
      <div class="st-content">
        <div class="st-loading">Loading...</div>
      </div>
    `;
    
    // Add toggle functionality
    const header = popup.querySelector('.st-header');
    header.addEventListener('click', () => {
      popup.classList.toggle('st-collapsed');
      const icon = popup.querySelector('.st-toggle-icon');
      icon.textContent = popup.classList.contains('st-collapsed') ? '▼' : '▲';
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
  function init() {
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
    const popup = createPopup();

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

