const mongoose=require('mongoose');
const closeApp=require("./ErrorHandler");

exports.conn = new Promise(async (resolve, reject) => {
    try {
        var Drivers;
        var URI = "mongodb+srv://superUser:dixit@cluster0.zsdhrt0.mongodb.net/Taxido?retryWrites=true&w=majority&appName=Cluster0";
        await mongoose.connect(URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log("Taxido Database Connected Successfully");
        const connection = mongoose.connection;
        
        // Set up Drivers collection with geospatial index
        Drivers = connection.collection('DriversInfo');
        await Drivers.createIndex({ location: "2dsphere" });
        console.log("Drivers collection indexes:", await Drivers.getIndexes());
        
        // Set up Users collection
        const Users = connection.collection('Users');
        await Users.createIndex({ email: 1 }, { unique: true });
        await Users.createIndex({ username: 1 }, { unique: true });
        console.log("Users collection indexes set up");
        
        resolve(Drivers);
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        closeApp(err);
    }
});
