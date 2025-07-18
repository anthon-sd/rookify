'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  User.init({
    username: DataTypes.STRING,
    email: DataTypes.STRING,
    rating: DataTypes.INTEGER,
    playstyle: DataTypes.STRING,
    chess_com_username: DataTypes.STRING,
    lichess_username: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};