function hubBase () {
  let base = (process.env.HUB_API_BASE || 'https://beta.api.d1g.uk').trim()
  base = base.replace(/\/$/, '')
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`
  }
  return base
}

module.exports = { hubBase }
