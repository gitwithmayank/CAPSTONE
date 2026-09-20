import mongoose from 'mongoose';

const connectDB = async ()=>{
    try { 
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
        });
    console.log("MongoDB connected");
} catch(err) {
    console.error('MongoDB connection error:' ,err);
    // Transient DNS/network failures (e.g. ENOTFOUND) par exit karne ki
    // jagah retry karo — cluster wapas aane par connect ho jayega.
    setTimeout(connectDB, 5000);
}
}

export default connectDB