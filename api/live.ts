export default async function handler(req, res) {
  try {
    const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
    const r = await fetch(`${baseUrl}/api/results/live`);
    const data = await r.json();

    return res.status(200).json({
      ...data,
      compatibilityEndpoint: '/api/live',
      source: 'api/results/live'
    });
  } catch (e) {
    return res.status(500).json({
      error: 'live-compat-failed',
      compatibilityEndpoint: '/api/live'
    });
  }
}
