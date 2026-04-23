import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { broadcastDataUpdate } from '../socket/index.js';

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { family: true }
    });
    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: '獲取客戶列表失敗' });
  }
};

export const getCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { family: true, serviceRecords: true, bills: true }
    });
    if (!customer) {
      res.status(404).json({ error: '客戶不存在' });
      return;
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: '獲取客戶失敗' });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { careId, name, bed, gender, idCard, birth, phone, status, basicFee, subsidy, deposit, admissionDate, note } = req.body;

    if (!careId || !name || !gender || !idCard || !birth) {
      res.status(400).json({ error: '必填欄位不完整' });
      return;
    }

    const customer = await prisma.customer.create({
      data: {
        id: careId,
        careId,
        name,
        bed,
        gender,
        idCard,
        birth: new Date(birth),
        phone,
        status: status || '在院',
        basicFee: basicFee || 0,
        subsidy: subsidy || 0,
        deposit: deposit || 0,
        admissionDate: admissionDate ? new Date(admissionDate) : null,
        note
      }
    });

    broadcastDataUpdate('customers', 'create', customer.id);
    res.json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: '新增客戶失敗' });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, bed, gender, idCard, birth, phone, status, basicFee, subsidy, deposit, admissionDate, note, balance } = req.body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        bed,
        gender,
        idCard,
        birth: birth ? new Date(birth) : undefined,
        phone,
        status,
        basicFee,
        subsidy,
        deposit,
        admissionDate: admissionDate ? new Date(admissionDate) : undefined,
        note,
        balance
      }
    });

    broadcastDataUpdate('customers', 'update', customer.id);
    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: '更新客戶失敗' });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.customer.delete({ where: { id } });
    broadcastDataUpdate('customers', 'delete', id);
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除客戶失敗' });
  }
};

// Family members
export const addFamilyMember = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.params as { customerId: string };
    const { name, phone, isMain } = req.body;

    const family = await prisma.family.create({
      data: { customerId, name, phone, isMain: isMain || false }
    });
    res.json(family);
  } catch (error) {
    res.status(500).json({ error: '新增家屬失敗' });
  }
};

export const updateFamilyMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, phone, isMain } = req.body;
    const family = await prisma.family.update({
      where: { id },
      data: { name, phone, isMain }
    });
    res.json(family);
  } catch (error) {
    res.status(500).json({ error: '更新家屬失敗' });
  }
};

export const deleteFamilyMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.family.delete({ where: { id } });
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除家屬失敗' });
  }
};
