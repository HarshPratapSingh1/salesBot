import express from 'express';
import Call from '../models/Call.js';
import Lead from '../models/Lead.js';
import { protect } from '../utils/authMiddleware.js';

const router = express.Router();

// Get all calls for this client
router.get('/', protect, async (req, res) => {
    try {
        const calls = await Call.find({ clientId: req.clientId })
            .populate('productId', 'name url')
            .sort({ createdAt: -1 });
        res.json(calls);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get single call
router.get('/:id', protect, async (req, res) => {
    try {
        const call = await Call.findOne({
            _id: req.params.id,
            clientId: req.clientId
        }).populate('productId', 'name url');

        if (!call) return res.status(404).json({ message: 'Call not found' });
        res.json(call);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get all leads for this client
router.get('/leads/all', protect, async (req, res) => {
    try {
        const leads = await Lead.find({ clientId: req.clientId })
            .populate('productId', 'name')
            .sort({ createdAt: -1 });
        res.json(leads);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

export default router;