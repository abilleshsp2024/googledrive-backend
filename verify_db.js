
import './server/config.js';
import mongoose from 'mongoose';
import DriveItem from './server/models/DriveItem.js';
import User from './server/models/User.js';
import fs from 'fs';

const run = async () => {
    const results = {};
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const users = await User.find();
        results.users = users.map(u => ({
            username: u.username,
            id: u._id,
            parentId: u.parentId // Added this
        }));

        results.itemCount = await DriveItem.countDocuments();

        // Group items by parentId count
        const parentCounts = await DriveItem.aggregate([
            { $group: { _id: "$parentId", count: { $sum: 1 } } }
        ]);
        results.parentCounts = parentCounts;

        fs.writeFileSync('db_audit_2.json', JSON.stringify(results, null, 2));
        console.log('Audit 2 written to db_audit_2.json');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
