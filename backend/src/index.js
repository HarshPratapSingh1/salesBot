import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initSocket } from './socket/index.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import callRoutes from './routes/calls.js';
import embedRoutes from './routes/embed.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Serve embed script
app.get('/agent.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(join(__dirname, '../public/agent.js'));
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/embed', embedRoutes);

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'SalesBot backend running!' });
});

// Init Socket.IO
initSocket(server);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB error:', err));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});