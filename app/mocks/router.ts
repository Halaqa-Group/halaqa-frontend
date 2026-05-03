interface HandlerArgs {
  params: Record<string, string>
  query: Record<string, string>
  body: any
}

type Handler = (args: HandlerArgs) => unknown | Promise<unknown>

interface Route {
  method: string
  pattern: string
  handler: Handler
}

const routes: Route[] = []

export function register(method: string, pattern: string, handler: Handler): void {
  routes.push({ method: method.toUpperCase(), pattern, handler })
}

function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const ps = pattern.split('/').filter(Boolean)
  const xs = path.split('/').filter(Boolean)
  if (ps.length !== xs.length) return null
  const out: Record<string, string> = {}
  for (let i = 0; i < ps.length; i++) {
    const seg = ps[i]!
    const val = xs[i]!
    if (seg.startsWith(':')) out[seg.slice(1)] = decodeURIComponent(val)
    else if (seg !== val) return null
  }
  return out
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class MockError extends Error {
  status: number
  data: { message: string }
  response: { status: number, _data: { message: string } }
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.data = { message }
    this.response = { status, _data: { message } }
  }
}

export interface MatchResult {
  matched: boolean
  data?: unknown
}

export async function tryMock(
  url: string,
  opts: { method?: string, body?: unknown } = {}
): Promise<MatchResult> {
  if (!url.startsWith('/')) return { matched: false }

  const method = (opts.method || 'GET').toUpperCase()
  const [pathRaw, queryStr = ''] = url.split('?')
  const path = pathRaw!
  const query = Object.fromEntries(new URLSearchParams(queryStr))

  for (const route of routes) {
    if (route.method !== method) continue
    const params = matchPattern(route.pattern, path)
    if (params === null) continue
    await delay(80 + Math.random() * 120)
    const data = await route.handler({ params, query, body: opts.body })
    return { matched: true, data }
  }
  return { matched: false }
}
