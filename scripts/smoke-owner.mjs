const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3002'

const checks = [
  { name: 'login', path: '/login', expectedText: 'ShaqoNet' },
  { name: 'overview', path: '/dashboard', expectedText: 'Overview' },
  { name: 'companies', path: '/companies', expectedText: 'Companies' },
  { name: 'requests', path: '/requests', expectedText: 'Requests' },
  { name: 'leads', path: '/leads', expectedText: 'Leads' },
  { name: 'billing', path: '/billing', expectedText: 'Billing' },
  { name: 'settings', path: '/settings', expectedText: 'Release readiness' },
]

function urlFor(path) {
  return new URL(path, baseUrl).toString()
}

async function checkRoute(check) {
  const response = await fetch(urlFor(check.path), { redirect: 'manual' })
  const body = await response.text().catch(() => '')
  const okStatus = response.status >= 200 && response.status < 400
  const hasExpectedText =
    response.status >= 300 ||
    !check.expectedText ||
    body.toLowerCase().includes(check.expectedText.toLowerCase())

  return {
    ...check,
    status: response.status,
    ok: okStatus && hasExpectedText,
    reason: okStatus ? (hasExpectedText ? '' : `missing "${check.expectedText}"`) : `HTTP ${response.status}`,
  }
}

const results = []
for (const check of checks) {
  try {
    results.push(await checkRoute(check))
  } catch (error) {
    results.push({
      ...check,
      status: 'error',
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    })
  }
}

const failed = results.filter((result) => !result.ok)
for (const result of results) {
  const marker = result.ok ? 'OK' : 'FAIL'
  const suffix = result.reason ? ` - ${result.reason}` : ''
  console.log(`${marker} ${result.name} ${result.path} (${result.status})${suffix}`)
}

if (failed.length > 0) {
  console.error(`Smoke failed: ${failed.length}/${results.length} checks failed.`)
  process.exit(1)
}

console.log(`Smoke passed: ${results.length}/${results.length} checks passed.`)
