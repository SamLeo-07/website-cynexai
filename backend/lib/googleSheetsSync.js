'use strict';

/**
 * Pushes data to the Google Sheets Webhook asynchronously.
 * 
 * @param {string} action The type of event (e.g., 'LOGIN', 'ENROLLMENT', 'ADMIN_ACTION')
 * @param {object} payload The data associated with the event
 */
async function pushToGoogleSheet(action, payload) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return;
  }

  const data = { action, payload };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error(`[GoogleSheets] Failed to sync action: ${action}. Status Code: ${response.status}`);
    }
  } catch (error) {
    console.error(`[GoogleSheets] Sync exception: ${error.message}`);
  }
}

module.exports = {
  pushToGoogleSheet
};
