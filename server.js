
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import errorHandler from './src/middlewares/errorHandler.js';

// Import routes
import authRoutes from './src/routes/auth.routes.js';
import userSettingsRoutes from './src/routes/userSettings.routes.js';
import partyRoutes from './src/routes/newParty.routes.js';
import ledgerRoutes from './src/routes/FinalTrialBalance.routes.js';

// Load env vars
dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Welcome route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Account Ledger API' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', userSettingsRoutes);
app.use('/api/party', partyRoutes);
app.use('/api/ledger', ledgerRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
