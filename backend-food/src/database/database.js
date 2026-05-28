require("dotenv").config();

module.exports = {
  dialect: process.env.DB_DIALECT || "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  define: {
    timestamps: true,
    underscored: false
  },
  logging: process.env.NODE_ENV === "development" ? console.log : false
};
