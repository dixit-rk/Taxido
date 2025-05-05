const mongoose = require('mongoose');

// MongoDB Atlas connection URL
const URI = "mongodb+srv://superUser:dixit@cluster0.zsdhrt0.mongodb.net/Taxido?retryWrites=true&w=majority&appName=Cluster0";

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    await mongoose.connect(URI, {
      connectTimeoutMS: 30000, // 30 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds timeout
    });
    
    console.log('Successfully connected to MongoDB Atlas!');
    console.log('Connection details:', mongoose.connection.host);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed successfully');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
  }
}

testConnection(); 