import { backendApi } from './api';

// Description: Login user functionality
// Endpoint: POST /token
// Request: FormData with username (email) and password
// Response: { access_token: string, token_type: string }
export const login = async (email: string, password: string) => {
  try {
    const response = await backendApi.loginUser(email, password);
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    throw new Error(error.message);
  }
};

// Description: Register user functionality
// Endpoint: POST /register
// Request: { email: string, username: string, password: string, rating: number, playstyle: string, rating_progress: array }
// Response: { email: string, username: string, ... }
export const register = async (email: string, password: string) => {
  try {
    const response = await backendApi.registerUser({
      email,
      username: email.split('@')[0],
      password,
      rating: 1500,
      playstyle: 'balanced',
      rating_progress: []
    });
    return response;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Description: Logout
// Clears authentication tokens and user data
export const logout = async () => {
  try {
    backendApi.logout();
    return { success: true, message: 'Logged out successfully' };
  } catch (error: any) {
    throw new Error(error.message);
  }
};
