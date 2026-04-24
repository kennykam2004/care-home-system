import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { code: 'AM01' },
      update: {},
      create: { code: 'AM01', name: '院長', org: '頤安(逸麗)護老院', description: '頤安(逸麗)護老院 院長', type: '管理員' },
    }),
    prisma.role.upsert({
      where: { code: 'AM02' },
      update: {},
      create: { code: 'AM02', name: '護士', org: '頤安(逸麗)護老院', description: '頤安(逸麗)護老院 護士', type: '工作員' },
    }),
    prisma.role.upsert({
      where: { code: 'AM03' },
      update: {},
      create: { code: 'AM03', name: '活動協調員', org: '頤安(逸麗)護老院', description: '頤安(逸麗)護老院 活動協調員', type: '工作員' },
    }),
    prisma.role.upsert({
      where: { code: 'AM04' },
      update: {},
      create: { code: 'AM04', name: '助理', org: '頤安(逸麗)護老院', description: '頤安(逸麗)護老院 助理', type: '工作員' },
    }),
    prisma.role.upsert({
      where: { code: 'AM05' },
      update: {},
      create: { code: 'AM05', name: '入生命體徵健康照護員', org: '頤安(逸麗)護老院', description: '頤安(逸麗)護老院 入生命體徵健康照護員', type: '工作員' },
    }),
  ]);

  console.log('Created roles:', roles.map(r => r.name));

  // Create director user (password: admin123)
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const director = await prisma.user.upsert({
    where: { employeeId: 'admin' },
    update: {},
    create: {
      employeeId: 'admin',
      name: '甘家豪',
      password: hashedPassword,
      phone: '12345678',
      email: 'director@carehome.com',
      status: '啟動',
      roles: {
        create: { roleId: roles[0].id, isDefault: true },
      },
    },
  });

  console.log('Created director user:', director.name);

  // Create staff users
  const staffData = [
    { employeeId: '203012', name: '王小華 入生命體徵健康照護員', roleIndex: 4 },
    { employeeId: '203011', name: '陳建民 入生命體徵健康照護員', roleIndex: 4 },
    { employeeId: '203010', name: '林佳玲 入生命體徵健康照護員', roleIndex: 4 },
    { employeeId: '203009', name: '張雅婷 入生命體徵健康照護員', roleIndex: 4 },
    { employeeId: '203008', name: '吳志明 入生命體徵健康照護員', roleIndex: 4 },
    { employeeId: '203007', name: '劉家豪 入生命體徵健康照護員', roleIndex: 4 },
    { employeeId: '203006', name: '楊曉雯 助理', roleIndex: 3 },
    { employeeId: '203005', name: '趙子龍 助理', roleIndex: 3 },
    { employeeId: '203004', name: '孫麗君 助理', roleIndex: 3 },
    { employeeId: '203003', name: '周家宇 活動協調員', roleIndex: 2 },
  ];

  for (const staff of staffData) {
    const user = await prisma.user.upsert({
      where: { employeeId: staff.employeeId },
      update: {},
      create: {
        employeeId: staff.employeeId,
        name: staff.name,
        password: hashedPassword,
        status: '啟動',
        roles: {
          create: { roleId: roles[staff.roleIndex].id, isDefault: true },
        },
      },
    });
    console.log('Created staff user:', user.name);
  }

  // Create initial services
  const servicesData = [
    // 護理服務 (M001 - M022)
    { id: 'M001', type: '護理服務', isCommon: true, name: '血糖測試', price: 20.00, stock: 9536 },
    { id: 'M002', type: '護理服務', isCommon: true, name: '抽血費', price: 100.00, stock: null }, // 無限
    { id: 'M003', type: '護理服務', isCommon: true, name: '鼻氧管', price: 7.00, stock: 150 },
    { id: 'M004', type: '護理服務', isCommon: false, name: '傷口護理費 (小)', price: 30.00, stock: null }, // 無限
    { id: 'M005', type: '護理服務', isCommon: false, name: '傷口護理費 (中)', price: 50.00, stock: null }, // 無限
    { id: 'M006', type: '護理服務', isCommon: true, name: '製氧機護理費', price: 300.00, stock: null }, // 無限
    { id: 'M007', type: '護理服務', isCommon: true, name: '尿管護理費', price: 300.00, stock: null }, // 無限
    { id: 'M008', type: '護理服務', isCommon: false, name: '尿袋', price: 12.00, stock: 500 },
    { id: 'M009', type: '護理服務', isCommon: true, name: '胃管護理費', price: 300.00, stock: null }, // 無限
    { id: 'M010', type: '護理服務', isCommon: true, name: '血糖監測+注射服務', price: 500.00, stock: 950 },
    { id: 'M011', type: '護理服務', isCommon: true, name: '注射服務', price: 30.00, stock: null }, // 無限
    { id: 'M012', type: '護理服務', isCommon: true, name: '更換胃管', price: 100.00, stock: null }, // 無限
    { id: 'M013', type: '護理服務', isCommon: false, name: '傷口護理費 (大)', price: 80.00, stock: null }, // 無限
    { id: 'M014', type: '護理服務', isCommon: true, name: 'DuoDERM密封式水凝膠敷料', price: 39.20, stock: 200 },
    { id: 'M015', type: '護理服務', isCommon: true, name: 'Hydrofiber+Ag', price: 101.60, stock: 150 },
    { id: 'M016', type: '護理服務', isCommon: true, name: 'Foams', price: 49.80, stock: 300 },
    { id: 'M017', type: '護理服務', isCommon: true, name: 'UrgoTul 親水油紗布', price: 20.60, stock: 400 },
    { id: 'M018', type: '護理服務', isCommon: true, name: '氧氣面罩', price: 23.00, stock: 80 },
    { id: 'M019', type: '護理服務', isCommon: true, name: '皮下注射', price: 300.00, stock: null }, // 無限
    { id: 'M020', type: '護理服務', isCommon: true, name: '更換尿管', price: 100.00, stock: null }, // 無限
    { id: 'M021', type: '護理服務', isCommon: false, name: '抽痰', price: 20.00, stock: null }, // 無限
    { id: 'M022', type: '護理服務', isCommon: true, name: '氣墊床', price: 300.00, stock: 15 },
    // 照顧服務 (C001 - C015)
    { id: 'C001', type: '照顧服務', isCommon: true, name: '陪診', price: 50.00, stock: null }, // 無限
    { id: 'C002', type: '照顧服務', isCommon: true, name: '夜用尿片 (中碼) Medical', price: 50.00, stock: 14 },
    { id: 'C003', type: '照顧服務', isCommon: true, name: '日用尿片 (中碼) Medical', price: 40.00, stock: 50 },
    { id: 'C004', type: '照顧服務', isCommon: true, name: '床墊', price: 25.00, stock: 30 },
    { id: 'C005', type: '照顧服務', isCommon: true, name: '夜用尿片 (大碼) Medical', price: 50.00, stock: 45 },
    { id: 'C006', type: '照顧服務', isCommon: true, name: '日用尿片 (大碼) Medical', price: 40.00, stock: 60 },
    { id: 'C007', type: '照顧服務', isCommon: true, name: '急診陪送', price: 100.00, stock: null }, // 無限
    { id: 'C008', type: '照顧服務', isCommon: true, name: '夜用尿片 (中碼)', price: 55.00, stock: 100 },
    { id: 'C009', type: '照顧服務', isCommon: true, name: '日用尿片(大碼)', price: 110.00, stock: 120 },
    { id: 'C010', type: '照顧服務', isCommon: true, name: '夜用尿片 (大碼)', price: 55.00, stock: 80 },
    { id: 'C011', type: '照顧服務', isCommon: true, name: '日用尿片(中碼)', price: 55.00, stock: 150 },
    { id: 'C012', type: '照顧服務', isCommon: true, name: '凝固粉 (細罐125g)', price: 39.00, stock: 200 },
    { id: 'C013', type: '照顧服務', isCommon: false, name: '好的接送 (單程)', price: 30.00, stock: null }, // 無限
    { id: 'C014', type: '照顧服務', isCommon: false, name: '洗腎陪送 (來回)', price: 100.00, stock: null }, // 無限
    { id: 'C015', type: '照顧服務', isCommon: true, name: '冷氣費', price: 100.00, stock: null }, // 無限
  ];

  for (const service of servicesData) {
    await prisma.service.upsert({
      where: { id: service.id },
      update: {},
      create: service,
    });
  }
  console.log('Created services:', servicesData.length);

  // Create initial inventory records
  const inventoryData = [
    { id: 'REC0346561444336779264', itemId: 'C001', date: new Date('2026-04-16T18:00:00'), type: '照顧服務', reason: '增加', qty: 4 },
    { id: 'REC0346561444336779265', itemId: 'C001', date: new Date('2026-04-17T10:30:00'), type: '照顧服務', reason: '客戶服務使用扣除', qty: -2 },
    { id: 'REC0346561444336779266', itemId: 'M001', date: new Date('2026-04-15T09:15:00'), type: '護理服務', reason: '增加', qty: 100 },
  ];

  for (const record of inventoryData) {
    await prisma.inventoryRecord.upsert({
      where: { id: record.id },
      update: {},
      create: record,
    });
  }
  console.log('Created inventory records:', inventoryData.length);

  // Create sample customers
  const customersData = [
    { id: 'C00001', careId: 'A001', name: '陳大明', gender: '男', idCard: '1234567890', birth: new Date('1945-03-15'), balance: 5000, phone: '62123456', status: '在院', basicFee: 8000, subsidy: 3000, deposit: 16000, admissionDate: new Date('2024-01-15'), note: '高血壓患者，需定期服藥' },
    { id: 'C00002', careId: 'A002', name: '李小美', gender: '女', idCard: '2345678901', birth: new Date('1948-07-22'), balance: 3000, phone: '62876543', status: '在院', basicFee: 8000, subsidy: 3000, deposit: 16000, admissionDate: new Date('2024-02-20'), note: '糖尿病患者，需血糖監測' },
    { id: 'C00003', careId: 'A003', name: '張國強', gender: '男', idCard: '3456789012', birth: new Date('1942-11-08'), balance: 8000, phone: '63987654', status: '在院', basicFee: 8000, subsidy: 3000, deposit: 16000, admissionDate: new Date('2023-11-10'), note: '行動不便，需輪椅' },
    { id: 'C00004', careId: 'A004', name: '林秀英', gender: '女', idCard: '4567890123', birth: new Date('1950-05-30'), balance: 2000, phone: '64098765', status: '在院', basicFee: 8000, subsidy: 3000, deposit: 16000, admissionDate: new Date('2024-03-01'), note: '輕度失智' },
    { id: 'C00005', careId: 'A005', name: '黃文傑', gender: '男', idCard: '5678901234', birth: new Date('1946-09-12'), balance: 0, phone: '65109876', status: '離院', basicFee: 8000, subsidy: 3000, deposit: 16000, admissionDate: new Date('2024-01-05'), note: '已於2026年3月出院' },
    { id: 'C00006', careId: 'A006', name: '王淑芬', gender: '女', idCard: '6789012345', birth: new Date('1952-02-18'), balance: 6000, phone: '66210987', status: '在院', basicFee: 8000, subsidy: 3000, deposit: 16000, admissionDate: new Date('2024-04-15'), note: '' },
    { id: 'C00007', careId: 'A007', name: '劉志偉', gender: '男', idCard: '7890123456', birth: new Date('1944-12-25'), balance: 4500, phone: '67321098', status: '在院', basicFee: 8000, subsidy: 3000, deposit: 16000, admissionDate: new Date('2023-12-01'), note: '心臟病患者' },
    { id: 'C00008', careId: 'A008', name: '陳美玲', gender: '女', idCard: '8901234567', birth: new Date('1949-08-05'), balance: 1500, phone: '68432109', status: '在院', basicFee: 8000, subsidy: 3000, deposit: 16000, admissionDate: new Date('2024-05-20'), note: '需要特別照顧' },
  ];

  for (const customer of customersData) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: {},
      create: customer,
    });
  }
  console.log('Created customers:', customersData.length);

  // Create family contacts for customers
  const familyData = [
    { id: 'F00001', customerId: 'C00001', name: '陳俊杰', phone: '98887777', isMain: true },
    { id: 'F00002', customerId: 'C00001', name: '陳家欣', phone: '98887778', isMain: false },
    { id: 'F00003', customerId: 'C00002', name: '李志明', phone: '97776666', isMain: true },
    { id: 'F00004', customerId: 'C00003', name: '張淑怡', phone: '96665555', isMain: true },
    { id: 'F00005', customerId: 'C00004', name: '林建國', phone: '95554444', isMain: true },
    { id: 'F00006', customerId: 'C00006', name: '黃偉文', phone: '94443333', isMain: true },
    { id: 'F00007', customerId: 'C00007', name: '劉秀蘭', phone: '93332222', isMain: true },
    { id: 'F00008', customerId: 'C00008', name: '陳建豪', phone: '92221111', isMain: true },
  ];

  for (const family of familyData) {
    await prisma.family.upsert({
      where: { id: family.id },
      update: {},
      create: family,
    });
  }
  console.log('Created family contacts:', familyData.length);

  // Create sample service records for the current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const serviceRecordsData = [
    { recordId: `SR${Date.now()}001`, customerId: 'C00001', date: new Date(`${currentMonth}-05`), type: '護理服務', serviceId: 'M001', name: '血糖測試', qty: 1, amount: 20 },
    { recordId: `SR${Date.now()}002`, customerId: 'C00001', date: new Date(`${currentMonth}-10`), type: '照顧服務', serviceId: 'C001', name: '陪診', qty: 1, amount: 50 },
    { recordId: `SR${Date.now()}003`, customerId: 'C00002', date: new Date(`${currentMonth}-03`), type: '護理服務', serviceId: 'M001', name: '血糖測試', qty: 1, amount: 20 },
    { recordId: `SR${Date.now()}004`, customerId: 'C00002', date: new Date(`${currentMonth}-08`), type: '護理服務', serviceId: 'M010', name: '血糖監測+注射服務', qty: 1, amount: 500 },
    { recordId: `SR${Date.now()}005`, customerId: 'C00003', date: new Date(`${currentMonth}-02`), type: '照顧服務', serviceId: 'C001', name: '陪診', qty: 2, amount: 100 },
    { recordId: `SR${Date.now()}006`, customerId: 'C00003', date: new Date(`${currentMonth}-12`), type: '護理服務', serviceId: 'M002', name: '抽血費', qty: 1, amount: 100 },
    { recordId: `SR${Date.now()}007`, customerId: 'C00004', date: new Date(`${currentMonth}-06`), type: '照顧服務', serviceId: 'C002', name: '夜用尿片 (中碼) Medical', qty: 1, amount: 50 },
    { recordId: `SR${Date.now()}008`, customerId: 'C00006', date: new Date(`${currentMonth}-07`), type: '護理服務', serviceId: 'M003', name: '鼻氧管', qty: 1, amount: 7 },
    { recordId: `SR${Date.now()}009`, customerId: 'C00007', date: new Date(`${currentMonth}-09`), type: '照顧服務', serviceId: 'C015', name: '冷氣費', qty: 1, amount: 100 },
    { recordId: `SR${Date.now()}010`, customerId: 'C00008', date: new Date(`${currentMonth}-11`), type: '護理服務', serviceId: 'M019', name: '皮下注射', qty: 1, amount: 300 },
  ];

  for (const record of serviceRecordsData) {
    await prisma.serviceRecord.upsert({
      where: { recordId: record.recordId },
      update: {},
      create: record,
    });
  }
  console.log('Created service records:', serviceRecordsData.length);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
