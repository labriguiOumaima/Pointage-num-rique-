const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());  // ← doit être ici, avant les routes

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/pointages', require('./routes/pointageRoutes'));
app.use('/api/conges', require('./routes/congeRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT} 🚀`));