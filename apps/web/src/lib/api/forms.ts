import type { FormSchema } from '@flowform/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText)
    throw new Error(message || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const formsApi = {
  list(): Promise<FormSchema[]> {
    return fetch(`${API_URL}/api/forms`, { credentials: 'include' }).then(handleResponse<FormSchema[]>)
  },

  get(id: string): Promise<FormSchema> {
    return fetch(`${API_URL}/api/forms/${id}`, { credentials: 'include' }).then(handleResponse<FormSchema>)
  },

  create(data: { title: string }): Promise<{ id: string }> {
    return fetch(`${API_URL}/api/forms`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<{ id: string }>)
  },

  delete(id: string): Promise<void> {
    return fetch(`${API_URL}/api/forms/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    })
  },
}
