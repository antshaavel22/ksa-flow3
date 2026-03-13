// Vercel serverless function — receives form data, sends email to info@ksa.ee via Web3Forms

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, age, email, phone, diopter, lang } = req.body;

    // Validate required fields
    if (!name || !age || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Format the email body
    const langLabels = {
      et: { subject: 'Flow3 silmauuringu päring', from: 'maandumislehelt' },
      ru: { subject: 'Заявка на обследование Flow3', from: 'с лендинга' },
      en: { subject: 'Flow3 Eye Examination Enquiry', from: 'from landing page' },
    };

    const labels = langLabels[lang] || langLabels.et;

    const messageBody = [
      `${labels.subject} ${labels.from}`,
      '',
      `Name / Nimi: ${name}`,
      `Age / Vanus: ${age}`,
      `Email / E-post: ${email}`,
      `Phone / Telefon: ${phone}`,
      `Diopters / Dioptrid: ${diopter || 'N/A'}`,
      `Language / Keel: ${lang || 'et'}`,
      '',
      `Submitted: ${new Date().toISOString()}`
    ].join('\n');

    const apiKey = process.env.FORM_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'FORM_API_KEY not configured' });
    }

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: apiKey,
        subject: `${labels.subject} — ${name}`,
        from_name: name,
        replyto: email,
        name: name,
        age: age,
        email: email,
        phone: phone,
        diopter: diopter || 'N/A',
        message: messageBody,
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      return res.status(200).json({ success: true, message: 'Form submitted successfully' });
    } else {
      console.error('Web3Forms error:', JSON.stringify(data));
      return res.status(500).json({ error: 'Form submission failed', details: data });
    }

  } catch (error) {
    console.error('Form submission error:', error.message || error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
