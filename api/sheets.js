export default async function handler(req, res) {
  const url = process.env.VITE_SHEETS_URL
  if (!url) {
    return res.status(404).json({ error: 'VITE_SHEETS_URL not configured' })
  }
  try {
    const sheet = req.query?.sheet || 'all'
    const targetUrl = `${url}?sheet=${encodeURIComponent(sheet)}`
    const response = await fetch(targetUrl, {
      redirect: 'follow',
      headers: { 'Accept-Encoding': 'gzip' },
    })
    const data = await response.json()
    // CDN caches for 2 min; serves stale up to 1 hour while revalidating in background
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=3600')
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
