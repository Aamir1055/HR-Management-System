const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

const getFullUrl = (url: string) => {
  const baseUrl = 'http://localhost:5000/api';
  return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
};

export const api = {
  get: async (url: string) => {
    const response = await fetch(getFullUrl(url), {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return { data };
  },

  post: async (url: string, body: any) => {
    const response = await fetch(getFullUrl(url), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return { data };
  },

  put: async (url: string, body: any) => {
    const response = await fetch(getFullUrl(url), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return { data };
  },

  delete: async (url: string) => {
    const response = await fetch(getFullUrl(url), {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return { data: null };
  }
};
