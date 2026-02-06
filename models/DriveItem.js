import mongoose from 'mongoose';

const driveItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['folder', 'image', 'pdf', 'doc', 'other'], required: true },
    parentId: { type: String, default: null },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    size: { type: Number },
    mimeType: { type: String },
    s3Url: { type: String },
}, { timestamps: true });

driveItemSchema.index({ ownerId: 1, parentId: 1 });

export default mongoose.model('DriveItem', driveItemSchema);
