import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { config } from './config/index.js';
import { initSocket } from './socket/index.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import roleRoutes from './routes/role.routes.js';
import permissionRoutes from './routes/permission.routes.js';
import customerRoutes from './routes/customer.routes.js';
import serviceRoutes from './routes/service.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import billRoutes from './routes/bill.routes.js';
import serviceRecordRoutes from './routes/serviceRecord.routes.js';
import prepaidRoutes from './routes/prepaid.routes.js';
import billPublishRoutes from './routes/billPublish.routes.js';
import cashRecordRoutes from './routes/cashRecord.routes.js';
import { loginRateLimiter } from './middleware/rateLimit.middleware.js';

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth/login', loginRateLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/service-records', serviceRecordRoutes);
app.use('/api/prepaid-records', prepaidRoutes);
app.use('/api/bill-publishes', billPublishRoutes);
app.use('/api/cash-records', cashRecordRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const io = initSocket(httpServer, config.frontendUrl);

httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
