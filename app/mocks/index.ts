// Side-effect import: registers every mock handler in handlers.ts.
// To promote an endpoint to the real API, delete its `register(...)` call there;
// the router will then fall through to `$fetch` for that path.
import './handlers'

export { tryMock } from './router'
