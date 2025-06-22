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
      console.log('🔐 Registering user:', userData.email);
      
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log('📝 Registration response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Registration failed:', errorData);
        const errorMessage = errorData.detail || errorData.message || 'Registration failed';
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Registration successful:', result.email);
      return result;
    } catch (error) {
      console.error('💥 Registration error:', error);
      // If it's a network error or parsing error, provide a better message
      if (error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to backend server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  /**
   * Login user to backend (for sync functionality)
   */
  async loginUser(email, password) {
    try {
      console.log('🔐 Attempting login for:', email);
      
      const formData = new FormData();
      formData.append('username', email); // FastAPI uses 'username' field
      formData.append('password', password);

      console.log('📤 Sending login request...');
      const response = await fetch(`${API_BASE_URL}/token`, {
        method: 'POST',
        body: formData,
      });

      console.log('📥 Login response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Login failed:', errorData);
        const errorMessage = errorData.detail || errorData.message || 'Login failed';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Login token received');
      
      this.token = data.access_token;
      localStorage.setItem('backend_jwt_token', this.token);

      console.log('👤 Getting user info...');
      // Get user info
      const userInfo = await this.getCurrentUser();
      this.user = userInfo;
      localStorage.setItem('backend_user', JSON.stringify(userInfo));

      console.log('✅ Login successful for user:', userInfo.email);
      return { token: this.token, user: userInfo };
    } catch (error) {
      console.error('💥 Login error:', error);
      
      // Provide better error messages
      if (error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to backend server. Please check if the backend is running.');
      }
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
  async startSync(platform, username, months = 1, lichessToken = null, fromDate = null, toDate = null) {
    if (!this.token || !this.user) {
      throw new Error('User not authenticated with backend');
    }

    try {
      const syncData = {
        platform,
        username,
        months,
        ...(lichessToken && { lichess_token: lichessToken }),
        ...(fromDate && { fromDate }),
        ...(toDate && { toDate }),
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
    console.log('🔐 Attempting backend auto-login for:', supabaseUser?.email);
    
    if (this.isAuthenticated()) {
      console.log('✅ Already authenticated with backend');
      return { success: true, user: this.user };
    }

    if (!supabaseUser?.email) {
      console.log('❌ No Supabase user email available');
      return { success: false, message: 'No Supabase user email available' };
    }

    try {
      console.log('📝 Attempting registration...');
      // Try to register first (in case user doesn't exist in backend)
      await this.registerUser({
        email: supabaseUser.email,
        username: supabaseUser.email.split('@')[0],
        password: defaultPassword,
        rating: 1500,
        playstyle: 'balanced',
        rating_progress: []
      });
      console.log('✅ Registration successful');
    } catch (error) {
      // Registration might fail if user already exists, that's okay
      console.log('ℹ️ Registration attempt result:', error.message);
    }

    try {
      console.log('🔑 Attempting login...');
      // Try to login
      await this.loginUser(supabaseUser.email, defaultPassword);
      console.log('✅ Backend login successful');
      return { success: true, user: this.user };
    } catch (error) {
      console.log('❌ Backend login failed:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get user's analyzed games with pagination
   */
  async getGames(limit = 20, offset = 0, platform = null) {
    if (!this.token || !this.user) {
      throw new Error('User not authenticated with backend');
    }

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      if (platform) {
        params.append('platform', platform);
      }

      const response = await fetch(`${API_BASE_URL}/games/${this.user.id}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch games');
      }

      return await response.json();
    } catch (error) {
      console.error('Get games error:', error);
      throw error;
    }
  }

  /**
   * Get detailed analysis for a specific game
   */
  async getGameAnalysis(gameId) {
    if (!this.token || !this.user) {
      throw new Error('User not authenticated with backend');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/games/${this.user.id}/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch game analysis');
      }

      return await response.json();
    } catch (error) {
      console.error('Get game analysis error:', error);
      throw error;
    }
  }

  /**
   * Get fresh analysis for a specific position
   */
  async analyzePosition(gameId, fen, moveNumber = 1) {
    if (!this.token || !this.user) {
      throw new Error('User not authenticated with backend');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/games/${this.user.id}/${gameId}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fen,
          move_number: moveNumber
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to analyze position');
      }

      return await response.json();
    } catch (error) {
      console.error('Analyze position error:', error);
      throw error;
    }
  }
}

const backendApiService = new BackendApiService();
export default backendApiService; 