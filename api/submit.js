// Vercel serverless function — receives form data, sends email to info@ksa.ee
// Uses Web3Forms API (free) — requires FORM_API_KEY env variable
// Or falls back to Formspree if FORMSPREE_ID env variable is set

export default async function handler(req, res) {
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

    // Try Web3Forms first (if API key configured)
    const apiKey = process.env.FORM_API_KEY;
    if (apiKey) {
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
      }
    }

    // Try Formspree (if form ID configured)
    const formspreeId = process.env.FORMSPREE_ID;
    if (formspreeId) {
      const response = await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: `${labels.subject} — ${name}`,
          _replyto: email,
          name,
          age,
          email,
          phone,
          diopter: diopter || 'N/A',
          message: messageBody,
        }),
      });

      if (response.ok) {
        return res.status(200).json({ success: true, message: 'Form submitted successfully' });
      }
    }

    // If no API keys configured, return instructions
    return res.status(200).json({ 
      success: true, 
      message: 'Form received (configure FORM_API_KEY or FORMSPREE_ID env vars for email delivery)',
      data: { name, age, email, phone, diopter, lang }
    });

  } catch (error) {
    console.error('Form submission error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
