// Background service worker for fetching Sensor Tower API data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchAppData') {
    const { appId, platform } = request;
    const baseUrl = 'https://app.sensortower.com/api';
    const url = `${baseUrl}/${platform}/apps?app_ids=${encodeURIComponent(appId)}`;
    
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('Error fetching Sensor Tower data:', error);
        sendResponse({ success: false, error: error.message || 'Failed to fetch data' });
      });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

