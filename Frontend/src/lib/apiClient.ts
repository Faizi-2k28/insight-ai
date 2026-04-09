const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    // Setup headers
    const headers = new Headers(options.headers || {});
    
    if (options.body instanceof FormData) {
        headers.delete('Content-Type');
    } else if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
        headers.set('Content-Type', 'application/json');
    }

    // Attach JWT token from localStorage if it exists on the client side
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('insight_access_token');
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
    }

    const config: RequestInit = {
        ...options,
        headers,
    };

    const response = await fetch(url, config);

    // Parse Response
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    // Handle non-2xx responses
    if (!response.ok) {
        let errorMessage = 'An error occurred while fetching data from the backend';
        if (typeof data === 'object' && data !== null) {
            if (data.detail) {
                errorMessage = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
            } else if (data.message) {
                errorMessage = data.message;
            }
        } else if (typeof data === 'string' && data) {
            errorMessage = data;
        }
        
        // If unauthorized, clean up token and session to force clean state
        if (response.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('insight_access_token');
                localStorage.removeItem('insight_session');
            }
        }

        throw new Error(errorMessage);
    }

    return data;
}
