// Backend API integration for RookifyCoach

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface LoginResponse {
  user: {
    id: string
    email: string
    username: string
    rating: number
    playstyle: string
  }
  token: string
}

interface RegisterData {
  email: string
  username: string
  password: string
  rating: number
  playstyle: string
  chess_com_username?: string
  lichess_username?: string
  rating_progress: any[]
}

interface SyncJob {
  id: string
  platform: string
  username: string
  status: 'pending' | 'fetching' | 'analyzing' | 'completed' | 'failed'
  games_found: number
  games_analyzed: number
  created_at: string
  completed_at?: string
  error?: string
  user_id: string
  months_requested: number
  updated_at?: string
}

interface GameData {
  id: string
  platform: string
  game_id: string
  white_player: string
  black_player: string
  opponent: string
  result: string
  user_result: string
  time_control: string
  opening: string
  opening_name?: string
  pgn: string
  key_moments?: string | any[]
  analysis_summary?: string
  analysis?: string  // Added for analysis summary
  white_accuracy?: number
  black_accuracy?: number
  user_accuracy?: number
  avg_accuracy?: number  // Added for average accuracy
  played_at: string
  // Analysis statistics
  mistakes_count?: number
  blunders_count?: number
  inaccuracies_count?: number
  brilliant_moves_count?: number
  total_moves?: number
}

class BackendAPI {
  public token: string | null = null
  public user: any = null

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('backend_jwt_token') || localStorage.getItem('authToken')
    const userData = localStorage.getItem('backend_user') || localStorage.getItem('userData')
    if (userData) {
      try {
        this.user = JSON.parse(userData)
      } catch (e) {
        console.error('Failed to parse user data:', e)
        this.clearAuth()
      }
    }
  }

  private clearAuth(): void {
    this.token = null
    this.user = null
    localStorage.removeItem('backend_jwt_token')
    localStorage.removeItem('backend_user')
    localStorage.removeItem('authToken')
    localStorage.removeItem('userData')
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user
  }

  async loginUser(email: string, password: string): Promise<LoginResponse> {
    console.log('🔐 Attempting login for:', email)
    
    try {
      // Backend expects FormData for OAuth2PasswordRequestForm
      const formData = new FormData()
      formData.append('username', email)  // Backend uses 'username' field for email
      formData.append('password', password)

      const response = await fetch(`${API_BASE_URL}/token`, {
        method: 'POST',
        body: formData,  // Send FormData, not JSON
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Login failed')
      }

      const tokenData = await response.json()
    
    // Get user info after successful login
    const userResponse = await fetch(`${API_BASE_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to get user information')
    }

    const user = await userResponse.json()
    
    // Store auth data
    this.token = tokenData.access_token
    this.user = user
    localStorage.setItem('backend_jwt_token', tokenData.access_token)
    localStorage.setItem('backend_user', JSON.stringify(user))
    // Also store with old keys for compatibility
    localStorage.setItem('authToken', tokenData.access_token)
    localStorage.setItem('userData', JSON.stringify(user))

      console.log('✅ Login successful for user:', user.email)
      return { token: tokenData.access_token, user }
    } catch (error: any) {
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please ensure the backend is running.')
      }
      throw error
    }
  }

  async registerUser(userData: RegisterData): Promise<any> {
    console.log('🔐 Registering user:', userData.email)
    
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail || errorData.message || 'Registration failed'
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('✅ Registration successful:', result.email)
    return result
  }

  logout(): void {
    this.clearAuth()
  }

  getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    }
  }

  async authenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `API request failed: ${response.statusText}`)
      }

      return response.json()
    } catch (error: any) {
      // Handle network errors (like ERR_CONNECTION_REFUSED)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please ensure the backend is running.')
      }
      throw error
    }
  }

  /**
   * Auto-login attempt using stored Supabase user email
   */
  async tryAutoLogin(supabaseUser: any, defaultPassword = 'defaultpassword123'): Promise<{ success: boolean; user?: any; message?: string }> {
    console.log('🔐 Attempting backend auto-login for:', supabaseUser?.email)
    
    if (this.isAuthenticated()) {
      console.log('✅ Already authenticated with backend')
      return { success: true, user: this.user }
    }

    if (!supabaseUser?.email) {
      console.log('❌ No Supabase user email available')
      return { success: false, message: 'No Supabase user email available' }
    }

    try {
      console.log('📝 Attempting registration...')
      // Try to register first (in case user doesn't exist in backend)
      await this.registerUser({
        email: supabaseUser.email,
        username: supabaseUser.email.split('@')[0],
        password: defaultPassword,
        rating: 1500,
        playstyle: 'balanced',
        rating_progress: []
      })
      console.log('✅ Registration successful')
    } catch (error: any) {
      // Registration might fail if user already exists, that's okay
      console.log('ℹ️ Registration attempt result:', error.message)
    }

    try {
      console.log('🔑 Attempting login...')
      // Try to login
      await this.loginUser(supabaseUser.email, defaultPassword)
      console.log('✅ Backend login successful')
      return { success: true, user: this.user }
    } catch (error: any) {
      console.log('❌ Backend login failed:', error.message)
      return { success: false, message: error.message }
    }
  }

  /**
   * Start a sync job
   */
  async startSync(platform: string, username: string, months = 1, lichessToken?: string, fromDate?: string, toDate?: string, gameMode?: string, result?: string, color?: string): Promise<SyncJob> {
    if (!this.token || !this.user) {
      throw new Error('User not authenticated with backend')
    }

    const syncData = {
      platform,
      username,
      months,
      ...(lichessToken && { lichess_token: lichessToken }),
      ...(fromDate && { fromDate }),
      ...(toDate && { toDate }),
      ...(gameMode && { gameMode }),
      ...(result && { result }),
      ...(color && { color }),
    }

    return this.authenticatedRequest(`/sync-games/${this.user.id}`, {
      method: 'POST',
      body: JSON.stringify(syncData),
    })
  }

  /**
   * Get sync job status
   */
  async getSyncStatus(syncJobId: string): Promise<SyncJob> {
    return this.authenticatedRequest(`/sync-status/${syncJobId}`)
  }

  /**
   * Get user's sync job history
   */
  async getSyncHistory(): Promise<SyncJob[]> {
    if (!this.token || !this.user) {
      throw new Error('User not authenticated with backend')
    }

    return this.authenticatedRequest(`/sync-jobs/${this.user.id}`)
  }

  /**
   * Get user's analyzed games with pagination
   */
  async getGames(limit = 20, offset = 0, platform?: string): Promise<GameData[]> {
    if (!this.token || !this.user) {
      throw new Error('User not authenticated with backend')
    }

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    })
    
    if (platform) {
      params.append('platform', platform)
    }

    try {
      const result = await this.authenticatedRequest(`/games/${this.user.id}?${params}`)
      return Array.isArray(result) ? result : []
    } catch (error: any) {
      console.error('Error fetching games:', error)
      return [] // Return empty array on error
    }
  }

  /**
   * Get detailed analysis for a specific game
   */
  async getGameAnalysis(gameId: string): Promise<GameData> {
    if (!this.token || !this.user) {
      throw new Error('User not authenticated with backend')
    }

    return this.authenticatedRequest(`/games/${this.user.id}/${gameId}`)
  }

  /**
   * Get fresh analysis for a specific position
   */
  async analyzePosition(gameId: string, fen: string, moveNumber = 1): Promise<any> {
    if (!this.token || !this.user) {
      throw new Error('User not authenticated with backend')
    }

    return this.authenticatedRequest(`/games/${this.user.id}/${gameId}/analyze`, {
      method: 'POST',
      body: JSON.stringify({
        fen,
        move_number: moveNumber
      }),
    })
  }

  /**
   * Get current user info from backend
   */
  async getCurrentUser(): Promise<any> {
    if (!this.token) {
      throw new Error('No authentication token')
    }

    return this.authenticatedRequest('/users/me')
  }

  // Admin endpoint to backfill analysis summaries
  async backfillAnalysisSummaries() {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/admin/backfill-analysis-summaries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get user memory data
   */
  async getUserMemory(userId: string): Promise<any> {
    if (!this.token) {
      throw new Error('User not authenticated')
    }

    return this.authenticatedRequest(`/api/memory/${userId}`)
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<any> {
    if (!this.token) {
      throw new Error('User not authenticated')
    }

    return this.authenticatedRequest(`/api/memory/${userId}/preferences`)
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Record<string, any>): Promise<any> {
    if (!this.token) {
      throw new Error('User not authenticated')
    }

    return this.authenticatedRequest(`/api/memory/${userId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(preferences)
    })
  }

  /**
   * Reset user memory
   */
  async resetUserMemory(userId: string): Promise<any> {
    if (!this.token) {
      throw new Error('User not authenticated')
    }

    return this.authenticatedRequest(`/api/memory/${userId}/reset`, {
      method: 'DELETE'
    })
  }
}

export const backendApi = new BackendAPI()
export default backendApi
export type { SyncJob, GameData, LoginResponse, RegisterData }
