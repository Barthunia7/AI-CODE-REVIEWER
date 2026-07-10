const express = require('express');
const cors = require('cors');
const authRoutes = require('./auth');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes Mount Target
app.use('/api/auth', authRoutes);

// Health Endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: "online", database: "connected to supabase" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running smoothly on port ${PORT}`));
