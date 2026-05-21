export default async function handler(req, res) {
  const url = process.env.VITE_SHEETS_URL
  if (!url) {
    return res.status(404).json({ error: 'VITE_SHEETS_URL not configured' })
  }
  try {
    const response = await fetch(url, { redirect: 'follow' })
    const data = await response.json()
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600')
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
