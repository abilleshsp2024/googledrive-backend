import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

import crypto from 'crypto';

import nodemailer from 'nodemailer';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, parentId } = req.body;

        const existingUser = await User.findOne({ username: email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate random activation token
        const activationToken = crypto.randomBytes(32).toString('hex');

        const user = new User({
            firstName,
            lastName,
            username: email,
            password: hashedPassword,
            parentId: parentId || `${firstName.toUpperCase()}-${email}`, // Use provided parentId or generate one
            activationToken,
            isActive: false
        });

        await user.save();

        // -------- REAL EMAIL --------
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        console.log('Using Frontend URL:', frontendUrl);
        const activationLink = `${frontendUrl}/activate/${activationToken}`;

        // Initialize transporter lazily to ensure env vars are loaded
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            debug: true, // Show debug output
            logger: true // Log information to console
        });

        const mailOptions = {
            from: `"Auth System" <${email}>`,
            to: email,
            subject: "Activate your account",
            html: `
                <h2>Activate Your Account</h2>
                <p>Click the link below to activate:</p>
                <a href="${activationLink}">${activationLink}</a>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log("Activation email sent to:", email);

        res.status(201).json({
            message: 'Registration successful. Please check your email to activate your account.'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong' });
    }
});

// Activate Account
router.post('/activate', async (req, res) => {
    try {
        const { token } = req.body;

        const user = await User.findOne({ activationToken: token });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired activation token' });
        }

        user.isActive = true;
        user.activationToken = undefined;
        await user.save();

        res.status(200).json({ message: 'Account activated successfully. You can now login.' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const existingUser = await User.findOne({ username: email });
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!existingUser.isActive) {
            return res.status(400).json({ message: 'Account is not active. Please check your email.' });
        }

        // Update online status
        existingUser.isOnline = true;
        await existingUser.save();

        const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

        res.status(200).json({
            result: {
                id: existingUser._id,
                firstName: existingUser.firstName,
                lastName: existingUser.lastName,
                username: existingUser.username,
                parentId: existingUser.parentId,
                isOnline: existingUser.isOnline
            },
            token
        });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    try {
        const { userId } = req.body;
        if (userId) {
            await User.findByIdAndUpdate(userId, { isOnline: false });
        }
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong on server logout' });
    }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ username: email });
        if (!user) {
            // Check email info security practice: don't reveal if user exists, but for this exercise we might generally return success?
            // "If a user is not registered, he/she should not be able to log in and the corresponding error message should be displayed to the user."
            // But for forgot password, standard practice is usually vague, but the requirements say:
            // "On the page verify and validate the user’s email address then allow the user to click the forgot password button."
            // "Once the user email address is valid, then the system sends an email..."
            return res.status(404).json({ message: 'User with this email does not exist' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = Date.now() + 3600000; // 1 hour

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpires;
        await user.save();

        // -------- REAL EMAIL (PASSWORD RESET) --------
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

        // Initialize transporter lazily
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            debug: true,
            logger: true
        });

        const mailOptions = {
            from: `"Auth System" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Password Reset Request",
            html: `
                <h2>Password Reset</h2>
                <p>You requested a password reset. Click the link below to set a new password:</p>
                <a href="${resetLink}">${resetLink}</a>
                <p>If you didn't request this, please ignore this email.</p>
                <p>This link expires in 1 hour.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log("Password reset email sent to:", email);

        res.status(200).json({ message: 'Password reset link sent to email' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});

// Verify Token (Me)
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) return res.status(401).json({ message: 'No token' });

        const decodedData = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        const user = await User.findById(decodedData.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json({
            result: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                parentId: user.parentId
            }
        });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

export default router;
