import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config({ path: './.env.local' });

const getToken = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const user = await User.findOne().sort({ createdAt: -1 });

        if (user) {
            console.log('User found:', user.username);
            console.log('Activation Token:', user.activationToken);
            console.log(`ACTIVATION LINK: http://localhost:5173/activate/${user.activationToken}`);
        } else {
            console.log('No users found');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

getToken();
