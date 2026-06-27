const https = require('https');

const webhookUrl = "https://script.google.com/macros/s/AKfycby53lru0VCSP5ODno10Dy3g8lPspB7dTsomASUUFLVLqaujuBvW0kmaJNEuWFRsLgU/exec";

async function test() {
  const data = {
    action: "TEST_ACTION",
    payload: { message: "Hello from test script" }
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      redirect: 'follow'
    });

    const text = await response.text();
    console.log(`Status Code: ${response.status}`);
    console.log(`Response: ${text}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

test();
