const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const { to, toName, subject, htmlContent, attachments } = JSON.parse(event.body);
  const payload = {
    sender: { name: 'Fahrschulteam Thorsten Gels', email: 'lingen@fahrschulteam.info' },
    to: [{ email: to, name: toName || to }],
    replyTo: { email: 'lingen@fahrschulteam.info', name: 'Fahrschulteam Thorsten Gels' },
    subject, htmlContent,
    ...(attachments?.length ? { attachment: attachments } : {}),
  };
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.brevo.com', path: '/v3/smtp/email', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY, 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({
        statusCode: res.statusCode < 300 ? 200 : res.statusCode,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: res.statusCode < 300, status: res.statusCode, body }),
      }));
    });
    req.on('error', (e) => resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) }));
    req.write(data); req.end();
  });
};
