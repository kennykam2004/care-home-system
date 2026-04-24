import { Router } from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// JWT helper
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

function generateTokens(user: { id: string; employeeId: string; name: string; role: string }) {
  const jwt = require('jsonwebtoken');
  return {
    accessToken: jwt.sign(user, JWT_SECRET, { expiresIn: '15m' }),
    refreshToken: jwt.sign(user, JWT_REFRESH_SECRET, { expiresIn: '7d' })
  };
}

function authenticate(req: VercelRequest) {
  const jwt = require('jsonwebtoken');
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ============ AUTH ROUTES ============
router.post('/api/auth/login', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const { employeeId, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { employeeId },
      include: { roles: { include: { role: true } } }
    });

    if (!user) return res.status(401).json({ error: '用戶不存在' });
    if (user.status !== '啟動') return res.status(401).json({ error: '帳號已被停用' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: '密碼錯誤' });

    const role = user.roles[0]?.role;
    const userData = { id: user.id, employeeId: user.employeeId, name: user.name, role: role?.code || 'AM01' };
    const { accessToken, refreshToken } = generateTokens(userData);

    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user: { ...userData, roleName: role?.name || '院長' }, accessToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '服務器錯誤' });
  }
});

router.post('/api/auth/logout', (_req: VercelRequest, res: VercelResponse) => {
  res.cookie('refreshToken', '', { maxAge: 0 });
  res.json({ success: true });
});

router.post('/api/auth/refresh', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const jwt = require('jsonwebtoken');
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, include: { roles: { include: { role: true } } } });
    if (!user || user.status !== '啟動') return res.status(401).json({ error: 'User not valid' });

    const role = user.roles[0]?.role;
    const userData = { id: user.id, employeeId: user.employeeId, name: user.name, role: role?.code || 'AM01' };
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(userData);

    res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.get('/api/auth/me', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, include: { roles: { include: { role: true } } } });
    if (!dbUser || dbUser.status !== '啟動') return res.status(404).json({ error: 'User not found' });

    const role = dbUser.roles[0]?.role;
    res.json({ id: dbUser.id, employeeId: dbUser.employeeId, name: dbUser.name, role: role?.code || 'AM01', roleName: role?.name || '院長' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ USERS ROUTES ============
router.get('/api/users', async (_req: VercelRequest, res: VercelResponse) => {
  try {
    const users = await prisma.user.findMany({ include: { roles: { include: { role: true } } }, orderBy: { createdAt: 'desc' } });
    res.json(users.map(u => ({ id: u.id, employeeId: u.employeeId, name: u.name, phone: u.phone, status: u.status, createdAt: u.createdAt, role: u.roles[0]?.role?.code, roleName: u.roles[0]?.role?.name })));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/users', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user || user.role !== 'AM01') return res.status(403).json({ error: '只有院長可以新增用戶' });

    const { employeeId, name, password, phone, status, role } = req.body;
    const hashedPassword = await bcrypt.hash(password || 'director123', 12);

    const newUser = await prisma.user.create({
      data: { id: crypto.randomUUID(), employeeId, name, password: hashedPassword, phone, status: status || '啟動', createdBy: user.id }
    });

    const defaultRole = await prisma.role.findFirst({ where: { code: role || 'AM01' } });
    if (defaultRole) await prisma.userRole.create({ data: { userId: newUser.id, roleId: defaultRole.id, isDefault: true } });

    res.json({ id: newUser.id, employeeId: newUser.employeeId, name: newUser.name });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/api/users/:id', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { name, phone, status, password } = req.body;
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (status) updateData.status = status;
    if (password) updateData.password = await bcrypt.hash(password, 12);

    const updated = await prisma.user.update({ where: { id }, data: updateData });
    res.json({ id: updated.id, employeeId: updated.employeeId, name: updated.name });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/api/users/:id', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user || user.role !== 'AM01') return res.status(403).json({ error: '只有院長可以刪除用戶' });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ ROLES & PERMISSIONS ============
router.get('/api/roles', async (_req: VercelRequest, res: VercelResponse) => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/api/permissions', async (_req: VercelRequest, res: VercelResponse) => {
  try {
    const permissions = await prisma.rolePermission.findMany({ include: { role: true } });
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ CUSTOMERS ROUTES ============
router.get('/api/customers', async (_req: VercelRequest, res: VercelResponse) => {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/customers', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user || user.role !== 'AM01') return res.status(403).json({ error: '只有院長可以新增客戶' });

    const data = req.body;
    const customer = await prisma.customer.create({
      data: {
        id: data.id || crypto.randomUUID(),
        careId: data.careId, name: data.name, gender: data.gender, idCard: data.idCard,
        birth: new Date(data.birth), phone: data.phone, status: data.status || '在院',
        bed: data.bed, balance: data.balance || 0, basicFee: data.basicFee || 0,
        subsidy: data.subsidy || 0, deposit: data.deposit || 0,
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : null,
        note: data.note
      }
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/api/customers/:id', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const data = req.body;
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        careId: data.careId, name: data.name, gender: data.gender, idCard: data.idCard,
        birth: data.birth ? new Date(data.birth) : undefined, phone: data.phone,
        status: data.status, bed: data.bed, balance: data.balance, basicFee: data.basicFee,
        subsidy: data.subsidy, deposit: data.deposit,
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined,
        note: data.note
      }
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/api/customers/:id', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user || user.role !== 'AM01') return res.status(403).json({ error: '只有院長可以刪除' });
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ FAMILY ROUTES ============
router.get('/api/customers/:id/family', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const family = await prisma.family.findMany({ where: { customerId: req.params.id } });
    res.json(family);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/customers/:id/family', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, phone, isMain } = req.body;
    const family = await prisma.family.create({
      data: { customerId: req.params.id, name, phone, isMain: isMain || false }
    });
    res.json(family);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/api/customers/:customerId/family', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const familyId = req.query.familyId as string;
    if (!familyId) return res.status(400).json({ error: 'Missing familyId' });

    await prisma.family.delete({ where: { id: familyId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ SERVICES ROUTES ============
router.get('/api/services', async (_req: VercelRequest, res: VercelResponse) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/services', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user || user.role !== 'AM01') return res.status(403).json({ error: '只有院長可以新增服務' });

    const data = req.body;
    const service = await prisma.service.create({
      data: { id: data.id || crypto.randomUUID(), type: data.type, name: data.name, price: data.price, stock: data.stock, isCommon: data.isCommon || false }
    });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/api/services/:id', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user || user.role !== 'AM01') return res.status(403).json({ error: '只有院長可以編輯服務' });

    const data = req.body;
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: { type: data.type, name: data.name, price: data.price, stock: data.stock, isCommon: data.isCommon }
    });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/api/services/:id', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user || user.role !== 'AM01') return res.status(403).json({ error: '只有院長可以刪除服務' });
    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ INVENTORY ROUTES ============
router.get('/api/inventory', async (_req: VercelRequest, res: VercelResponse) => {
  try {
    const services = await prisma.service.findMany({
      orderBy: { name: 'asc' },
      include: { inventoryRecords: { orderBy: { date: 'desc' }, take: 10 } }
    });
    res.json(services.map(s => ({ id: s.id, name: s.name, type: s.type, price: s.price, stock: s.stock, isCommon: s.isCommon, recentRecords: s.inventoryRecords })));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/inventory', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const data = req.body;
    const record = await prisma.inventoryRecord.create({
      data: { id: crypto.randomUUID(), itemId: data.itemId, date: new Date(data.date), type: data.type, reason: data.reason, qty: data.qty }
    });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ SERVICE RECORDS ROUTES ============
router.get('/api/service-records', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const { customerId, month } = req.query;
    const where: Record<string, unknown> = {};
    if (customerId) where.customerId = customerId as string;
    if (month) {
      const [year, m] = (month as string).split('-');
      where.date = { gte: new Date(parseInt(year), parseInt(m) - 1, 1), lte: new Date(parseInt(year), parseInt(m), 0, 23, 59, 59) };
    }

    const records = await prisma.serviceRecord.findMany({
      where,
      include: { customer: true, service: true },
      orderBy: { date: 'desc' }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/service-records', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const data = req.body;
    const record = await prisma.serviceRecord.create({
      data: {
        recordId: crypto.randomUUID(), customerId: data.customerId, date: new Date(data.date),
        type: data.type, serviceId: data.serviceId, name: data.name, qty: data.qty, amount: data.amount, note: data.note
      }
    });

    const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
    if (service && service.stock !== null) {
      await prisma.service.update({ where: { id: data.serviceId }, data: { stock: { decrement: data.qty } } });
      await prisma.inventoryRecord.create({
        data: { itemId: data.serviceId, date: new Date(), type: '支出', reason: `服務扣減: ${data.name}`, qty: data.qty }
      });
    }
    res.json(record);
  } catch (error) {
    console.error('Service record error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ BILLS ROUTES ============
router.get('/api/bills', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const { customerId, month } = req.query;
    if (!customerId || !month) return res.status(400).json({ error: '需要 customerId 和 month' });

    const [year, m] = (month as string).split('-');
    const startDate = new Date(parseInt(year), parseInt(m) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(m), 0, 23, 59, 59);

    const customer = await prisma.customer.findUnique({ where: { id: customerId as string } });
    if (!customer) return res.status(404).json({ error: '客戶不存在' });

    const serviceRecords = await prisma.serviceRecord.findMany({
      where: { customerId: customerId as string, date: { gte: startDate, lte: endDate } }
    });

    const serviceFee = serviceRecords.reduce((sum, r) => sum + r.amount, 0);
    const totalFee = customer.basicFee + serviceFee;
    const debt = totalFee - customer.balance;
    res.json({ customerId, month, basicFee: customer.basicFee, serviceFee, totalFee, prepaid: customer.balance, debt, status: debt <= 0 ? '已繳費' : '待繳費' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/bills/deduct-prepaid', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { customerId, amount } = req.body;
    if (!customerId || !amount) return res.status(400).json({ error: '缺少參數' });

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: { balance: { decrement: amount } }
    });

    await prisma.prepaidRecord.create({
      data: { customerId, amount: -amount, date: new Date(), note: '扣減預繳費' }
    });

    res.json({ success: true, balance: customer.balance });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ PREPAID RECORDS ROUTES ============
router.get('/api/prepaid-records', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const { customerId } = req.query;
    const where = customerId ? { customerId: customerId as string } : {};
    const records = await prisma.prepaidRecord.findMany({ where, orderBy: { date: 'desc' } });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/prepaid-records', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { customerId, amount, date, note } = req.body;
    const record = await prisma.prepaidRecord.create({
      data: { customerId, amount, date: new Date(date), note }
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: { balance: { increment: amount } }
    });

    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ BILL PUBLISHES ROUTES ============
router.get('/api/bill-publishes', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const { customerId } = req.query;
    const where = customerId ? { customerId: customerId as string } : {};
    const publishes = await prisma.billPublish.findMany({ where, orderBy: { publishedAt: 'desc' } });
    res.json(publishes);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/bill-publishes', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { customerId, month, totalFee, note } = req.body;
    const publish = await prisma.billPublish.create({
      data: { customerId, month, totalFee, publishedBy: user.id, note }
    });
    res.json(publish);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/api/bill-publishes/:id', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    await prisma.billPublish.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ CASH RECORDS ROUTES ============
router.get('/api/cash-records', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const { customerId } = req.query;
    const where = customerId ? { customerId: customerId as string } : {};
    const records = await prisma.cashRecord.findMany({ where, orderBy: { date: 'desc' } });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/cash-records', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { customerId, type, amount, date, reason, collectedBy, note } = req.body;
    const record = await prisma.cashRecord.create({
      data: { customerId, type, amount, date: new Date(date), reason, collectedBy, note }
    });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/api/cash-records/:id', async (req: VercelRequest, res: VercelResponse) => {
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    await prisma.cashRecord.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ HEALTH CHECK ============
router.get('/api/health', (_req: VercelRequest, res: VercelResponse) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export the router as a serverless function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  router(req, res as unknown as any);
}
