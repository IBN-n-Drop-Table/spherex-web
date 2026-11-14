/**
 * What the backend says when a request fails. Current shape (every endpoint):
 *   { detail: string, code: string, errors: [{ loc, msg, type }] | null }
 * `detail` is always readable (field problems are already folded into it); `code` is stable
 * (not_found, validation_error, service_unavailable, internal_error, http_<status>).
 * An older backend sent FastAPI's default, where a 422 `detail` was a LIST of {loc, msg}: that is
 * still understood, so the frontend works against either version.
 */
export interface FieldProblem {
  loc: (string | number)[]
  msg: string
  type?: string
}

export interface ApiProblem {
  status: number
  detail: string | null // readable message, null when the body had none (e.g. an HTML error page)
  code: string | null
  errors: FieldProblem[] | null
}

// Same wording as the backend's own `detail`: drop where the field lives (body / query / path).
const describeField = (f: FieldProblem) => {
  const field = f.loc.slice(1).join('.')
  return field ? `${field}: ${f.msg}` : f.msg
}

export function parseProblem(status: number, body: string): ApiProblem {
  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return { status, detail: null, code: null, errors: null }
  }
  const o = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>
  const code = typeof o.code === 'string' ? o.code : null

  if (typeof o.detail === 'string') {
    const errors = Array.isArray(o.errors) ? (o.errors as FieldProblem[]) : null
    return { status, detail: o.detail, code, errors }
  }
  // Older shape: `detail` is a list of field problems.
  if (Array.isArray(o.detail) && o.detail.length > 0) {
    const errors = (o.detail as Partial<FieldProblem>[]).map(d => ({ loc: d.loc ?? [], msg: d.msg ?? 'invalid', type: d.type }))
    return { status, detail: errors.map(describeField).join('; '), code, errors }
  }
  return { status, detail: null, code, errors: null }
}
