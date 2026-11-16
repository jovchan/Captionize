module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    platform: 'Vercel Serverless',
    engine: 'Google Gemini Flash',
    apiKeyConfigured: Boolean(process.env.GOOGLE_API_KEY),
  });
};
