import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import DriveItem from './models/DriveItem.js';

dotenv.config({ path: './.env.local' });

const resetDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        await User.deleteMany({});
        console.log('All users deleted');

        await DriveItem.deleteMany({});
        console.log('All drive items deleted');

        console.log('Database reset complete');
        process.exit(0);
    } catch (error) {
        console.error('Error resetting database:', error);
        process.exit(1);
    }
};

resetDb();
