import type { FormSchema } from '@flowform/types'
import type { UpdateFormDto } from '@flowform/validators'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res))
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }
  return res.json() as Promise<T>
}

// API trả lỗi theo RFC 7807 Problem Details (application/problem+json).
// Ưu tiên `detail` (mô tả cụ thể), rồi `title`, rồi raw text, cuối cùng là status.
async function extractErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  if (text) {
    try {
      const problem = JSON.parse(text) as { detail?: string; title?: string }
      if (problem.detail) return problem.detail
      if (problem.title) return problem.title
    } catch {
      // Không phải JSON — dùng raw text
    }
    return text
  }
  return res.statusText || `HTTP ${res.status}`
}

export const formsApi = {
  list(): Promise<FormSchema[]> {
    return fetch(`${API_URL}/api/forms`, { credentials: 'include' }).then(handleResponse<FormSchema[]>)
  },

  get(id: string): Promise<FormSchema> {
    return fetch(`${API_URL}/api/forms/${id}`, { credentials: 'include' }).then(handleResponse<FormSchema>)
  },

  create(data: { title: string }): Promise<FormSchema> {
    return fetch(`${API_URL}/api/forms`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<FormSchema>)
  },

  updateSchema(id: string, dto: UpdateFormDto, { keepalive = false }: { keepalive?: boolean } = {}): Promise<FormSchema> {
    return fetch(`${API_URL}/api/forms/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      keepalive,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    }).then(handleResponse<FormSchema>)
  },

  delete(id: string): Promise<void> {
    return fetch(`${API_URL}/api/forms/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse<void>)
  },
}
