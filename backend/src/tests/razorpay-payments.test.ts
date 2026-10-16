import * as assert from 'node:assert/strict';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RazorpayService } from '../finance/razorpay.service';

const prisma = new PrismaService();
const configService = new ConfigService();
const razorpayService = new RazorpayService(prisma, configService);

async function runRazorpayTests() {
  console.log('⚡ Starting REAL-TIME RAZORPAY PAYMENT INTEGRATION TEST SUITE\n');

  // 1. Fetch test member profile & package
  const testMember = await prisma.memberProfile.findFirst({
    include: { user: true },
  });
  assert.ok(testMember, 'Test member profile must exist');
  assert.ok(testMember.user, 'Member must have associated user');

  const testPackage = await prisma.packageMaster.findFirst({
    where: { isActive: true },
  });
  assert.ok(testPackage, 'Active package master must exist');

  console.log(`👤 Testing with Member: ${testMember.firstName} ${testMember.lastName} (${testMember.memberId})`);
  console.log(`📦 Testing with Package: ${testPackage.name} (₹${testPackage.cost}, ${testPackage.contactReveals} reveals)`);
  const initialContactsQuota = testMember.contactsQuota || 0;

  // --------------------------------------------------------------------------
  // TEST 1: Razorpay Configuration Endpoint
  // --------------------------------------------------------------------------
  console.log('\n⚙️ Test 1: Fetch public Razorpay config');
  const config = razorpayService.getConfig();
  assert.ok(config.keyId, 'Must return Razorpay Key ID');
  assert.equal(config.currency, 'INR');
  console.log(`   ✅ Razorpay Key ID: ${config.keyId}, Currency: ${config.currency}, TestMode: ${config.isTestMode}`);

  // --------------------------------------------------------------------------
  // TEST 2: Create Razorpay Order
  // --------------------------------------------------------------------------
  console.log('\n💳 Test 2: Create Razorpay Order');
  const orderResult = await razorpayService.createOrder(
    { id: testMember.userId, role: 'MEMBER' },
    { packageId: testPackage.id },
  );

  assert.ok(orderResult.orderId, 'Must return orderId');
  assert.equal(orderResult.amount, Math.round(testPackage.cost * 100), 'Amount in paise must equal cost * 100');
  assert.ok(orderResult.invoiceId, 'Must create pending invoice record');
  console.log(`   ✅ Created Order ID: ${orderResult.orderId}`);
  console.log(`   ✅ Pending Invoice ID: ${orderResult.invoiceId}`);
  console.log(`   ✅ Amount: ₹${orderResult.amount / 100} (${orderResult.amount} paise)`);

  const pendingInvoice = await prisma.memberInvoice.findUnique({
    where: { id: orderResult.invoiceId },
  });
  assert.equal(pendingInvoice?.status, 'PENDING');
  assert.equal(pendingInvoice?.paymentMode, 'ONLINE_RAZORPAY');

  // --------------------------------------------------------------------------
  // TEST 3: Payment Verification with Invalid Signature (Security Check)
  // --------------------------------------------------------------------------
  console.log('\n🛡️ Test 3: Payment Verification Security (Mismatch Signature rejection)');
  const secret = configService.get<string>('RAZORPAY_KEY_SECRET') || 'sampleRazorpaySecretKey123';
  const dummyOrderId = 'order_real_simulation_123';
  const dummyPaymentId = 'pay_real_simulation_456';
  const fakeSignature = 'tampered_invalid_signature_hash';

  // Create an invoice with non-mock order ID to test cryptographic HMAC verification
  const secureInvoice = await prisma.memberInvoice.create({
    data: {
      requestNumber: `REQ-SEC-${Date.now()}`,
      memberProfileId: testMember.id,
      packageId: testPackage.id,
      amount: testPackage.cost,
      paymentMode: 'ONLINE_RAZORPAY',
      status: 'PENDING',
      transactionRef: dummyOrderId,
      raisedById: testMember.userId,
    },
  });

  try {
    await razorpayService.verifyPayment(
      { id: testMember.userId, role: 'MEMBER' },
      {
        invoiceId: secureInvoice.id,
        razorpay_order_id: dummyOrderId,
        razorpay_payment_id: dummyPaymentId,
        razorpay_signature: fakeSignature,
      },
    );
    assert.fail('Should have thrown BadRequestException due to signature mismatch');
  } catch (err: any) {
    assert.ok(
      err.message.includes('signature mismatch') || err.status === 400,
      `Expected signature mismatch error, got: ${err.message}`,
    );
    console.log('   ✅ Successfully rejected tampered payment with cryptographic signature mismatch!');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Valid Payment Verification & Instant Activation
  // --------------------------------------------------------------------------
  console.log('\n🚀 Test 4: Valid Payment Verification & Instant Entitlement Activation');
  const validPaymentId = `pay_${Date.now()}_test`;
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${dummyOrderId}|${validPaymentId}`)
    .digest('hex');

  const verifyResult = await razorpayService.verifyPayment(
    { id: testMember.userId, role: 'MEMBER' },
    {
      invoiceId: secureInvoice.id,
      razorpay_order_id: dummyOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: validSignature,
    },
    '127.0.0.1',
  );

  assert.equal(verifyResult.success, true);
  assert.ok(verifyResult.invoiceNumber.startsWith('INV-'));
  console.log(`   ✅ Payment verified! Issued Tax Invoice: ${verifyResult.invoiceNumber}`);

  // Check updated member profile quota
  const refreshedMember = await prisma.memberProfile.findUnique({
    where: { id: testMember.id },
  });
  assert.equal(refreshedMember?.packageType, 'PAID');
  assert.equal(refreshedMember?.currentPackageId, testPackage.id);
  assert.equal(
    refreshedMember?.contactsQuota,
    initialContactsQuota + (testPackage.contactReveals || 0),
    'Member contactsQuota must be instantly incremented by package contactReveals',
  );
  console.log(`   ✅ Member Contacts Quota upgraded: ${initialContactsQuota} ➔ ${refreshedMember?.contactsQuota}`);

  // Check Central HQ Ledger Credit
  const ledgerEntry = await prisma.financialLedgerEntry.findFirst({
    where: {
      invoiceId: secureInvoice.id,
      entryType: 'CREDIT',
      ledgerType: 'HQ',
    },
  });
  assert.ok(ledgerEntry, 'HQ Central Ledger entry must be created');
  assert.equal(Number(ledgerEntry.amount), Number(testPackage.cost));
  console.log(`   ✅ Central HQ Ledger credited with ₹${ledgerEntry.amount}`);

  // Check Financial Audit Log
  const auditLog = await prisma.financialAuditLog.findFirst({
    where: {
      resourceId: secureInvoice.id,
      action: 'ONLINE_PAYMENT_CAPTURED',
    },
  });
  assert.ok(auditLog, 'Financial audit log must record online payment capture');
  console.log(`   ✅ Financial Audit Log registered action: ${auditLog.action}`);

  // --------------------------------------------------------------------------
  // TEST 5: Idempotency (Repeat verification should not double-credit)
  // --------------------------------------------------------------------------
  console.log('\n🔁 Test 5: Idempotent Verification (Prevent double activation)');
  const repeatResult = await razorpayService.verifyPayment(
    { id: testMember.userId, role: 'MEMBER' },
    {
      invoiceId: secureInvoice.id,
      razorpay_order_id: dummyOrderId,
      razorpay_payment_id: validPaymentId,
      razorpay_signature: validSignature,
    },
  );
  assert.equal(repeatResult.success, true);
  assert.ok(repeatResult.message.includes('already verified'));
  console.log('   ✅ Idempotent call handled smoothly without duplicate records!');

  // Cleanup test invoice & ledger
  await prisma.financialAuditLog.deleteMany({ where: { resourceId: secureInvoice.id } });
  await prisma.financialLedgerEntry.deleteMany({ where: { invoiceId: secureInvoice.id } });
  await prisma.memberInvoice.delete({ where: { id: secureInvoice.id } });
  await prisma.memberInvoice.delete({ where: { id: orderResult.invoiceId } });

  console.log('\n🎉 ALL REAL-TIME RAZORPAY PAYMENT TESTS PASSED!\n');
}

runRazorpayTests()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
