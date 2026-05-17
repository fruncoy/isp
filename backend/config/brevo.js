const axios = require('axios');

/**
 * Sends a transactional email via Brevo API using axios.
 * This is more stable than using the SDK which changes between versions.
 */
const sendEmail = async ({ to, subject, htmlContent, textContent }) => {
  const apiKey = process.env.BREVO_PASS;
  const senderEmail = process.env.BREVO_SENDER || "no-reply@isp-management.com";

  if (!apiKey) {
    console.warn('BREVO_PASS (API Key) is missing. Email not sent.');
    return;
  }

  const data = {
    sender: { name: "ISP Management", email: senderEmail },
    to: [{ email: to }],
    subject: subject,
    htmlContent: htmlContent
  };

  if (textContent) {
    data.textContent = textContent;
  }

  try {
    console.log('Brevo API request payload:', JSON.stringify(data, null, 2));
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', data, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('Email sent successfully via Brevo API:', response.data.messageId);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Brevo API Error Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error sending email via Brevo API:', error.message);
    }
    throw error;
  }
};

module.exports = { sendEmail };
