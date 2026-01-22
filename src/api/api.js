import Swal from 'sweetalert2';

const hostname = window.location.hostname; 
export const API_BASE_URL = `http://${hostname}:8080`;

export function getAccessToken() {
  return localStorage.getItem('accessToken');
}

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userInfo');
}

export async function fetchWithAuth(url, options = {}, auth = true) {
  const headers = options.headers || {};

  if (auth) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const isFormData = options.body instanceof FormData;
  const finalHeaders = { ...headers };
  
  if (!isFormData && !finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
  }
  
  if (isFormData) {
      delete finalHeaders['Content-Type'];
  }

  let response = await fetch(API_BASE_URL + url, {
    ...options,
    headers: finalHeaders,
    credentials: 'include',
  });

  // 1. Handle Critical Errors First (400)
  if (response.status === 400) {
    const res = await response.json();
    const errorHtml = `
      <div style="text-align: left; font-family: sans-serif;">
        <p style="font-weight: bold; color: #374151; margin-bottom: 10px;">The following fields are required:</p>
        <ul style="list-style: none; padding: 0;">
          ${res.errors.map(err => `
            <li style="margin-bottom: 8px; color: #dc2626; display: flex; align-items: center;">
              <i class="pi pi-times-circle" style="margin-right: 8px;"></i>
              ${err}
            </li>
          `).join('')}
        </ul>
      </div>
    `;

    Swal.fire({
      icon: 'error',
      title: 'Submission Denied',
      html: errorHtml,
      confirmButtonColor: '#0d9488',
      confirmButtonText: 'Correct Details',
    });

    throw new Error("Validation Failed");
  }

  // 2. Handle Token Refresh (401)
  if (response.status === 401 && auth) {
    const refreshResponse = await fetch(API_BASE_URL + '/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      const data = await refreshResponse.json();
      localStorage.setItem('accessToken', data.accessToken);
      return await fetchWithAuth(url, options, auth);
    }
    handleSessionExpiry();
    return;
  }

  // 3. SPECIAL HANDLING FOR DOWNLOADS
  // We return the blob immediately to prevent it from being parsed as text/JSON
  if (response.ok && url.includes('/download')) {
    return await response.blob();
  }

  // 4. Parse JSON for standard API calls
  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  }

  // 5. Handle Access Denied (403) or other failures
  if (!response.ok) {
    if (response.status === 403) {
      await Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: data?.message || 'Account inactive or unauthorized.',
        confirmButtonColor: '#0d9488',
      });
      handleSessionExpiry();
      return;
    }
    throw new Error(data?.message || `Request failed: ${response.status}`);
  }

  return data || await response.text();
}

function handleSessionExpiry() {
  localStorage.removeItem('accessToken');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login?expired=true';
  }
}

export async function login(username, password) {
  return fetchWithAuth('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }, false);
}

export const logoutUser = async () => {
    try {
        await fetchWithAuth('/auth/logout', { method: 'POST' });
    } catch (err) {
        console.error("Logout error", err);
    } finally {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
    }
};

export async function getProfile() {
  return fetchWithAuth('/user/me');
}

export async function changePassword(oldPassword, newPassword) {
  return fetchWithAuth('/user/me/password', {
    method: 'PUT',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

export async function getAllUsers() {
  return fetchWithAuth('/admin/users');
}

export async function registerUser(userData) {
  return fetchWithAuth('/admin/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function getUserById(userId) {
  return fetchWithAuth(`/admin/users/${userId}`);
}

export async function updateUser(userId, userData) {
  return fetchWithAuth(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
}

export async function deleteUser(userId) {
  return fetchWithAuth(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function updateUserStatus(userId, status) {
  return fetchWithAuth(`/admin/users/${userId}/status?status=${status}`, {
    method: 'PUT',
  });
}

export async function adminChangeUserPassword(userId, newPassword) {
  return fetchWithAuth(`/admin/users/${userId}/password`, {
    method: 'PUT',
    body: JSON.stringify({ newPassword }),
  });
}

export async function assignUserRole(userId, role) {
  return fetchWithAuth(`/super-admin/users/${userId}/role?role=${role}`, {
    method: 'PUT',
  });
}

export async function getMyActivities(lazyParams) {
    const { page, rows, sortField, sortOrder, filters } = lazyParams;
    let params = new URLSearchParams();
    params.append('page', page);
    params.append('size', rows);
    if (sortField) {
        const direction = sortOrder === 1 ? 'asc' : 'desc';
        params.append('sort', `${sortField},${direction}`);
    }
    if (filters) {
        Object.keys(filters).forEach((key) => {
            const filterValue = filters[key].value;
            if (filterValue !== null && filterValue !== undefined && filterValue !== '') {
                params.append(key, filterValue);
            }
        });
    }
    return fetchWithAuth(`/daily-activities?${params.toString()}`);
}

export async function createActivity(activityData) {
  return fetchWithAuth('/daily-activities', {
    method: 'POST',
    body: JSON.stringify(activityData),
  });
}

export async function updateActivity(id, activityData) {
  return fetchWithAuth(`/daily-activities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(activityData),
  });
}

export async function deleteActivity(id) {
  return fetchWithAuth(`/daily-activities/${id}`, {
    method: 'DELETE',
  });
}

export async function getTools() {
  return fetchWithAuth('/daily-activities/tools');
}

export async function getDashboardSummary(filters) {
  const { userId, filterType, date } = filters;
  const d = date instanceof Date ? date.toISOString().split('T')[0] : date;
  let url = `/admin/analytics/summary?filterType=${filterType}&date=${d}`;
  if (userId) url += `&userId=${userId}`;
  return fetchWithAuth(url);
}

export async function getDashboardLogs(filters, page = 0, size = 10) {
  const { userId, filterType, date } = filters;
  const d = date instanceof Date ? date.toISOString().split('T')[0] : date;
  let url = `/admin/analytics/logs?filterType=${filterType}&date=${d}&page=${page}&size=${size}`;
  if (userId) url += `&userId=${userId}`;
  return fetchWithAuth(url);
}

// --- NOTICES METHODS ---
export const getNotices = () => fetchWithAuth('/notices');

export const uploadNotice = (title, type, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchWithAuth(`/notices/upload?title=${encodeURIComponent(title)}&type=${encodeURIComponent(type)}`, {
        method: 'POST',
        body: formData
    });
};

export const updateNotice = (id, title, type, file) => {
    const formData = new FormData();
    if (file) formData.append('file', file);
    return fetchWithAuth(`/notices/${id}?title=${encodeURIComponent(title)}&type=${encodeURIComponent(type)}`, {
        method: 'PUT',
        body: formData
    });
};

export const downloadNotice = (id) => fetchWithAuth(`/notices/${id}/download`);
export const deleteNotice = (id) => fetchWithAuth(`/notices/${id}`, { method: 'DELETE' });

// --- MANUALS METHODS ---
export const listManuals = () => fetchWithAuth('/manuals');

export const uploadManual = (title, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchWithAuth(`/manuals/upload?title=${encodeURIComponent(title)}`, {
        method: 'POST',
        body: formData
    });
};

export const downloadManual = (id) => fetchWithAuth(`/manuals/${id}/download`);
export const removeManual = (id) => fetchWithAuth(`/manuals/${id}`, { method: 'DELETE' });