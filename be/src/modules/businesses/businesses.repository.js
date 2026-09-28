const prisma = require('../../config/database');

async function createBusinessTx(tx, data) {
  return tx.businessProfile.create({ data });
}
async function createMemberTx(tx, data) {
  return tx.businessMember.create({ data });
}
async function seedCoATx(tx, businessId) {
  const defaults = [
    { code:'1010', name:'Kas', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1020', name:'Bank', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1100', name:'Piutang Usaha', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1110', name:'Perlengkapan', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1120', name:'Sewa Dibayar Dimuka', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1130', name:'Asuransi Dibayar Dimuka', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1500', name:'Persediaan', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1510', name:'Peralatan', accountType:'Asset', normalBalance:'debit', isContra:false },
    { code:'1520', name:'Akumulasi Penyusutan', accountType:'Asset', normalBalance:'credit', isContra:true },
    { code:'2010', name:'Hutang Usaha', accountType:'Liability', normalBalance:'credit', isContra:false },
    { code:'2110', name:'Pendapatan Diterima Dimuka', accountType:'Liability', normalBalance:'credit', isContra:false },
    { code:'2120', name:'Beban YMH Dibayar', accountType:'Liability', normalBalance:'credit', isContra:false },
    { code:'2210', name:'Hutang Pajak', accountType:'Liability', normalBalance:'credit', isContra:false },
    { code:'3110', name:'Modal', accountType:'Equity', normalBalance:'credit', isContra:false },
    { code:'3111', name:'Prive', accountType:'Equity', normalBalance:'debit', isContra:true },
    { code:'3120', name:'Laba Ditahan', accountType:'Equity', normalBalance:'credit', isContra:false },
    { code:'3130', name:'Ikhtisar Laba Rugi', accountType:'Equity', normalBalance:'credit', isContra:false },
    { code:'4010', name:'Penjualan', accountType:'Revenue', normalBalance:'credit', isContra:false },
    { code:'4020', name:'Pendapatan Jasa', accountType:'Revenue', normalBalance:'credit', isContra:false },
    { code:'5010', name:'HPP', accountType:'Expense', normalBalance:'debit', isContra:false },
    { code:'5110', name:'Beban Gaji', accountType:'Expense', normalBalance:'debit', isContra:false },
    { code:'5120', name:'Beban Sewa', accountType:'Expense', normalBalance:'debit', isContra:false },
    { code:'5130', name:'Beban Listrik', accountType:'Expense', normalBalance:'debit', isContra:false },
    { code:'5140', name:'Beban Perlengkapan', accountType:'Expense', normalBalance:'debit', isContra:false },
    { code:'5150', name:'Beban Penyusutan', accountType:'Expense', normalBalance:'debit', isContra:false },
    { code:'5160', name:'Beban Lain-lain', accountType:'Expense', normalBalance:'debit', isContra:false },
    { code:'5210', name:'Beban Bunga', accountType:'Expense', normalBalance:'debit', isContra:false },
  ].map(c=>({businessId, ...c}));
  return tx.chartOfAccount.createMany({data: defaults, skipDuplicates:true});
}
async function findByUserId(userId) {
  const members = await prisma.businessMember.findMany({ where: { userId }, include: { business: true } });
  return members.map((m) => m.business);
}
async function findByUserIdPaginated(userId, skip, take) {
  const members = await prisma.businessMember.findMany({
    where: { userId },
    include: { business: true },
    skip,
    take,
    orderBy: { business: { businessName: 'asc' } },
  });
  return members.map((m) => m.business);
}
async function countByUserId(userId) {
  return prisma.businessMember.count({ where: { userId } });
}

async function findById(businessId) {
  return prisma.businessProfile.findUnique({ where: { id: Number(businessId) } });
}

async function updateById(businessId, data) {
  return prisma.businessProfile.update({ where: { id: Number(businessId) }, data });
}

module.exports = { createBusinessTx, createMemberTx, seedCoATx, findByUserId, findByUserIdPaginated, countByUserId, findById, updateById };
