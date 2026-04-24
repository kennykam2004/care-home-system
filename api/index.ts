import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

function generateTokens(user: { id: string; employeeId: string; name: string; role: string }) {
  return {
    accessToken: jwt.sign(user, JWT_SECRET, { expiresIn: '15m' }),
    refreshToken: jwt.sign(user, JWT_REFRESH_SECRET, { expiresIn: '7d' })
  };
}

function authenticate(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req;
  console.log('Request URL:', url, 'Method:', req.method);

  // Health check
  if (url === '/api/health') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  // Auth login
  if (url === '/api/auth/login' && req.method === 'POST') {
    const { employeeId, password } = req.body || {};
    try {
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
      return res.json({ user: { ...userData, roleName: role?.name || '院長' }, accessToken });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: '服務器錯誤' });
    }
  }

  // Auth logout
  if (url === '/api/auth/logout' && req.method === 'POST') {
    res.cookie('refreshToken', '', { maxAge: 0 });
    return res.json({ success: true });
  }

  // Auth refresh
  if (url === '/api/auth/refresh' && req.method === 'POST') {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      const user = await prisma.user.findUnique({ where: { id: (decoded as any).id }, include: { roles: { include: { role: true } } } });
      if (!user || user.status !== '啟動') return res.status(401).json({ error: 'User not valid' });
      const role = user.roles[0]?.role;
      const userData = { id: user.id, employeeId: user.employeeId, name: user.name, role: role?.code || 'AM01' };
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(userData);
      res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
      return res.json({ accessToken });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  // Auth me
  if (url === '/api/auth/me' && req.method === 'GET') {
    try {
      const user = authenticate(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, include: { roles: { include: { role: true } } } });
      if (!dbUser || dbUser.status !== '啟動') return res.status(404).json({ error: 'User not found' });
      const role = dbUser.roles[0]?.role;
      return res.json({ id: dbUser.id, employeeId: dbUser.employeeId, name: dbUser.name, role: role?.code || 'AM01', roleName: role?.name || '院長' });
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Users list
  if (url === '/api/users' && req.method === 'GET') {
    try {
      const users = await prisma.user.findMany({ include: { roles: { include: { role: true } } }, orderBy: { createdAt: 'desc' } });
      return res.json(users.map(u => ({ id: u.id, employeeId: u.employeeId, name: u.name, phone: u.phone, status: u.status, createdAt: u.createdAt, role: u.roles[0]?.role?.code, roleName: u.roles[0]?.role?.name })));
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Create user
  if (url === '/api/users' && req.method === 'POST') {
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
      return res.json({ id: newUser.id, employeeId: newUser.employeeId, name: newUser.name });
    } catch (error) {
      console.error('Create user error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Get customers
  if (url === '/api/customers' && req.method === 'GET') {
    try {
      const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
      return res.json(customers);
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Create customer
  if (url === '/api/customers' && req.method === 'POST') {
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
      return res.json(customer);
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Get services
  if (url === '/api/services' && req.method === 'GET') {
    try {
      const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
      return res.json(services);
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Get service records
  if (url?.startsWith('/api/service-records') && req.method === 'GET') {
    try {
      const { customerId, month } = req.query || {};
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
      return res.json(records);
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Create service record
  if (url?.startsWith('/api/service-records') && req.method === 'POST') {
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
      return res.json(record);
    } catch (error) {
      console.error('Service record error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Get bills
  if (url?.startsWith('/api/bills') && req.method === 'GET') {
    try {
      const { customerId, month } = req.query || {};
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
      return res.json({ customerId, month, basicFee: customer.basicFee, serviceFee, totalFee, prepaid: customer.balance, debt, status: debt <= 0 ? '已繳費' : '待繳費' });
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Deduct prepaid
  if (url === '/api/bills/deduct-prepaid' && req.method === 'POST') {
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
      return res.json({ success: true, balance: customer.balance });
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Get roles
  if (url === '/api/roles' && req.method === 'GET') {
    try {
      const roles = await prisma.role.findMany({ orderBy: { createdAt: 'asc' } });
      return res.json(roles);
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Get inventory
  if (url === '/api/inventory' && req.method === 'GET') {
    try {
      const services = await prisma.service.findMany({
        orderBy: { name: 'asc' },
        include: { inventoryRecords: { orderBy: { date: 'desc' }, take: 10 } }
      });
      return res.json(services.map(s => ({ id: s.id, name: s.name, type: s.type, price: s.price, stock: s.stock, isCommon: s.isCommon, recentRecords: s.inventoryRecords })));
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Get prepaid records
  if (url === '/api/prepaid-records' && req.method === 'GET') {
    try {
      const { customerId } = req.query || {};
      const where = customerId ? { customerId: customerId as string } : {};
      const records = await prisma.prepaidRecord.findMany({ where, orderBy: { date: 'desc' } });
      return res.json(records);
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Create prepaid record
  if (url === '/api/prepaid-records' && req.method === 'POST') {
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
      return res.json(record);
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Get bill publishes
  if (url === '/api/bill-publishes' && req.method === 'GET') {
    try {
      const { customerId } = req.query || {};
      const where = customerId ? { customerId: customerId as string } : {};
      const publishes = await prisma.billPublish.findMany({ where, orderBy: { publishedAt: 'desc' } });
      return res.json(publishes);
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Create bill publish
  if (url === '/api/bill-publishes' && req.method === 'POST') {
    try {
      const user = authenticate(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const { customerId, month, totalFee, note } = req.body;
      const publish = await prisma.billPublish.create({
        data: { customerId, month, totalFee, publishedBy: user.id, note }
      });
      return res.json(publish);
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Delete bill publish
  if (url?.match(/^\/api\/bill-publishes\/.+/) && req.method === 'DELETE') {
    try {
      const user = authenticate(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const id = url.split('/').pop();
      await prisma.billPublish.delete({ where: { id } });
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Get cash records
  if (url === '/api/cash-records' && req.method === 'GET') {
    try {
      const { customerId } = req.query || {};
      const where = customerId ? { customerId: customerId as string } : {};
      const records = await prisma.cashRecord.findMany({ where, orderBy: { date: 'desc' } });
      return res.json(records);
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Create cash record
  if (url === '/api/cash-records' && req.method === 'POST') {
    try {
      const user = authenticate(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const { customerId, type, amount, date, reason, collectedBy, note } = req.body;
      const record = await prisma.cashRecord.create({
        data: { customerId, type, amount, date: new Date(date), reason, collectedBy, note }
      });
      return res.json(record);
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Delete cash record
  if (url?.match(/^\/api\/cash-records\/.+/) && req.method === 'DELETE') {
    try {
      const user = authenticate(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const id = url.split('/').pop();
      await prisma.cashRecord.delete({ where: { id } });
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Get permissions
  if (url === '/api/permissions' && req.method === 'GET') {
    try {
      const permissions = await prisma.rolePermission.findMany({ include: { role: true } });
      return res.json(permissions);
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // 404 for all other routes
  return res.status(404).json({ error: 'Not found', url });
}
