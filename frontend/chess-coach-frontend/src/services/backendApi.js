/**
 * Backend API service for sync operations
 * Handles authentication with FastAPI backend and sync endpoints
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class BackendApiService {
  constructor() {
    this.token = localStorage.getItem('backend_jwt_token');
    this.user = JSON.parse(localStorage.getItem('backend_user') || 'null');
  }

  /**
   * Register user with backend (for sync functionality)
   */
  async registerUser(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user to backend (for sync functionality)
   */
  async loginUser(email, password) {
    try {
      const formData = new FormData();
      formData.append('username', email); // FastAPI uses 'username' field
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/token`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      this.token = data.access_token;
      localStorage.setItem('backend_jwt_token', this.token);

      // Get user info
      const userInfo = await this.getCurrentUser();
      this.user = userInfo;
      localStorage.setItem('backend_user', JSON.stringify(userInfo));

      return { token: this.token, user: userInfo };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Get current user info from backend
   */
  async getCurrentUser() {
    if (!this.token) {
      throw new Error('No authentication token');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get user info');
      }

      return await response.json();
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  /**
   * Start a sync job
   */
  async startSync(platform, username, months = 1, lichessToken = null) {
    if (!this.token || !this.user) {
      throw new Error('User not authenticated with backend');
    }

    try {
      const syncData = {
        platform,
        username,
        months,
        ...(lichessToken && { lichess_token: lichessToken }),
      };

      const response = await fetch(`${API_BASE_URL}/sync-games/${this.user.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(syncData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Sync failed to start');
      }

      return await response.json();
    } catch (error) {
      console.error('Sync start error:', error);
      throw error;
    }
  }

  /**
   * Get sync job status
   */
  async getSyncStatus(syncJobId) {
    if (!this.token) {
      throw new Error('No authentication token');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/sync-status/${syncJobId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get sync status');
      }

      return await response.json();
    } catch (error) {
      console.error('Sync status error:', error);
      throw error;
    }
  }

  /**
   * Get user's sync job history
   */
  async getSyncHistory() {
    if (!this.token || !this.user) {
      throw new Error('User not authenticated with backend');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/sync-jobs/${this.user.id}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get sync history');
      }

      return await response.json();
    } catch (error) {
      console.error('Sync history error:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated with backend
   */
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  /**
   * Logout from backend
   */
  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('backend_jwt_token');
    localStorage.removeItem('backend_user');
  }

  /**
   * Auto-login attempt using stored Supabase user email
   */
  async tryAutoLogin(supabaseUser, defaultPassword = 'defaultpassword123') {
    if (this.isAuthenticated()) {
      return { success: true, user: this.user };
    }

    if (!supabaseUser?.email) {
      return { success: false, message: 'No Supabase user email available' };
    }

    try {
      // Try to register first (in case user doesn't exist in backend)
      await this.registerUser({
        email: supabaseUser.email,
        username: supabaseUser.email.split('@')[0],
        password: defaultPassword,
        rating: 1500,
        playstyle: 'balanced'
      });
    } catch (error) {
      // Registration might fail if user already exists, that's okay
      console.log('Registration attempt result:', error.message);
    }

    try {
      // Try to login
      await this.loginUser(supabaseUser.email, defaultPassword);
      return { success: true, user: this.user };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

const backendApiService = new BackendApiService();
export default backendApiService; 