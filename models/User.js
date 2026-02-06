import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    activationToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    parentId: { type: String },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
