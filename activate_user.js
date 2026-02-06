import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config({ path: './.env.local' });

const activateUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const user = await User.findOne().sort({ createdAt: -1 });

        if (user) {
            user.isActive = true;
            await user.save();
            console.log(`User ${user.username} manually activated.`);
        } else {
            console.log('No users found');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

activateUser();
