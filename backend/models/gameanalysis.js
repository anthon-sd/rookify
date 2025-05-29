'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class GameAnalysis extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  GameAnalysis.init({
    userId: DataTypes.INTEGER,
    gameId: DataTypes.STRING,
    analysis: DataTypes.TEXT,
    strengths: DataTypes.TEXT,
    weaknesses: DataTypes.TEXT,
    date: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'GameAnalysis',
  });
  return GameAnalysis;
};