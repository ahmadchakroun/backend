const mongoose = require("mongoose");
const { MONGO_DB_CONFIG } = require("../config/app.config");

const connectDB = async () => {
  try {
    console.log("🔍 Connecting to MongoDB at:", MONGO_DB_CONFIG.DB);
    await mongoose.connect(MONGO_DB_CONFIG.DB, {
      useNewUrlParser: true, 
      useUnifiedTopology: true
    });
    console.log("🚀 MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
