// CSRF-protected API client
export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers)
  
  // Add CSRF token for non-GET requests
  if (options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())) {
    // Get CSRF token from cookie
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf-token='))
      ?.split('=')[1]
    
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken)
    }
  }
  
  return fetch(url, {
    ...options,
    headers
  })
}

// Convenience methods
export const api = {
  get: (url: string, options?: RequestInit) => 
    apiRequest(url, { ...options, method: 'GET' }),
    
  post: (url: string, data?: any, options?: RequestInit) =>
    apiRequest(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data ? JSON.stringify(data) : undefined
    }),
    
  put: (url: string, data?: any, options?: RequestInit) =>
    apiRequest(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data ? JSON.stringify(data) : undefined
    }),
    
  delete: (url: string, options?: RequestInit) =>
    apiRequest(url, { ...options, method: 'DELETE' })
}