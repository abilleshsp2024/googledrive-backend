import './config.js';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import driveRoutes from './routes/drive.js';




const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Strict Query Fix (common in Mongoose 6+)
mongoose.set('strictQuery', false);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/drive', driveRoutes);

app.get('/', (req, res) => {
    res.send('CloudDrive API is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`AWS Region: ${process.env.AWS_REGION}`); // Log region on startup
});
