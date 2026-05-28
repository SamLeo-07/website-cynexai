// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import cors
const Razorpay = require('razorpay'); // Razorpay SDK
const crypto = require('crypto'); // Import crypto for webhook signature verification

const app = express();
const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000

// --- Middleware ---
// IMPORTANT: Apply CORS as the very first middleware to ensure it's handled for all requests, including preflights.
app.use(cors()); 
app.use(bodyParser.json()); // Parse JSON request bodies

// Initialize Razorpay instance with your keys
// IMPORTANT: Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in your Vercel Environment Variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- API Endpoint to Create Razorpay Order ---
app.post('/create-order', async (req, res) => {
  console.log('Received /create-order request:', req.body);

  const { amount, currency = 'INR', receipt, notes, description } = req.body;

  // Basic validation
  if (!amount || isNaN(amount) || amount <= 0) {
    console.error('Validation Error: Invalid amount provided:', amount);
    return res.status(400).json({ error: true, message: 'Valid amount is required.' });
  }

  // Convert amount to paisa (Razorpay expects amount in smallest currency unit)
  const amountInPaisa = Math.round(parseFloat(amount) * 100);

  const options = {
    amount: amountInPaisa, // amount in the smallest currency unit (e.g., 10000 paisa = ₹100)
    currency: currency,
    receipt: receipt || `receipt_${Date.now()}`, // Unique receipt ID
    notes: notes, // Custom notes passed from frontend
    payment_capture: 1, // Auto capture payment upon success
    description: description || 'Payment for CynexAI Services',
  };

  try {
    const order = await razorpay.orders.create(options);
    console.log('Razorpay Order Created:', order);
    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      description: order.description,
      prefill: {
        name: `${notes.firstName || ''} ${notes.lastName || ''}`,
        email: notes.email || '',
        contact: notes.phoneNumber || '',
        vpa: notes.upiId || undefined // Prefill UPI ID if provided
      }
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error.message || error);
    // Send back the specific error message from Razorpay if available
    res.status(500).json({ error: true, message: error.message || 'Failed to create Razorpay order.' });
  }
});

// --- API Endpoint for Razorpay Webhook ---
// IMPORTANT: This URL must be configured in your Razorpay Dashboard -> Settings -> Webhooks
app.post('/razorpay-webhook', (req, res) => {
  console.log('Received Razorpay Webhook!');
  console.log('Webhook Headers:', req.headers);
  // console.log('Webhook Body:', req.body); // Avoid logging sensitive data in production

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET; // Your webhook secret from Vercel ENV
  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not set in environment variables!');
    return res.status(500).json({ status: 'error', message: 'Webhook secret not configured.' });
  }

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  // Verify the webhook signature
  if (digest === req.headers['x-razorpay-signature']) {
    console.log('Webhook signature verified successfully!');

    // Process the webhook event
    const event = req.body.event;
    const payment = req.body.payload.payment.entity;
    const order = req.body.payload.order ? req.body.payload.order.entity : null;

    console.log(`Event Type: ${event}`);
    console.log(`Payment ID: ${payment.id}, Status: ${payment.status}`);

    // --- IMPORTANT: Log to Google Sheet ---
    // This part would require setting up Google Sheets API with Node.js.
    // For now, we'll just log to console.
    // If you want to integrate Google Sheets, you'd need:
    // 1. A Google Cloud Project.
    // 2. Enable Google Sheets API.
    // 3. Create a Service Account Key (JSON file).
    // 4. Use 'googleapis' library in Node.js to append rows.
    // This is a separate, more involved integration.

    res.status(200).json({ status: 'success', message: 'Webhook received and processed.' });

  } else {
    console.error('Webhook signature verification failed!');
    res.status(400).json({ status: 'error', message: 'Invalid signature' });
  }
});

// --- Basic GET route for health check (optional, but good for Vercel root) ---
app.get('/', (req, res) => {
  res.status(200).send('CynexAI Backend API is running.');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Node.js backend server running on http://localhost:${PORT}`);
  console.log('Ensure RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET are set as Vercel Environment Variables.');
});
