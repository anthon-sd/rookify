'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Recommendation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Recommendation.init({
    userId: DataTypes.INTEGER,
    gameAnalysisId: DataTypes.INTEGER,
    recommendation: DataTypes.TEXT,
    priority: DataTypes.INTEGER,
    status: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Recommendation',
  });
  return Recommendation;
};