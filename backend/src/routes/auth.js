import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Client from '../models/Client.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existing = await Client.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const client = await Client.create({
            name,
            email,
            password: hashedPassword
        });

        const token = jwt.sign(
            { clientId: client._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Account created successfully',
            token,
            client: {
                id: client._id,
                name: client.name,
                email: client.email,
                plan: client.plan
            }
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const client = await Client.findOne({ email });
        if (!client) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, client.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { clientId: client._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            client: {
                id: client._id,
                name: client.name,
                email: client.email,
                plan: client.plan
            }
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

export default router;