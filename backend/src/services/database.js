const supabase = require('../config/supabase');

const databaseService = {
  // User operations
  async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async getUserById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Game Analysis operations
  async createGameAnalysis(analysisData) {
    const { data, error } = await supabase
      .from('game_analysis')
      .insert([analysisData])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async getGameAnalysisByUserId(userId) {
    const { data, error } = await supabase
      .from('game_analysis')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  },

  // Recommendation operations
  async createRecommendation(recommendationData) {
    const { data, error } = await supabase
      .from('recommendations')
      .insert([recommendationData])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async getRecommendationsByUserId(userId) {
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  }
};

module.exports = databaseService; 