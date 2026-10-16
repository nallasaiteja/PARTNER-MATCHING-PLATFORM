import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const phone = process.env.TWILIO_PHONE_NUMBER;

  console.log('--- Twilio Config Check ---');
  console.log(`SID: ${sid ? sid.slice(0, 6) + '...' + sid.slice(-4) : 'MISSING'}`);
  console.log(`Token: ${token ? 'PRESENT (' + token.length + ' chars)' : 'MISSING'}`);
  console.log(`Phone: ${phone}`);

  if (!sid || !token) {
    console.error('Missing credentials');
    return;
  }

  const authHeader = `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`;

  // 1. Check Account details
  try {
    const accRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: authHeader },
    });
    const accData = await accRes.json();
    console.log('\n--- Twilio Account Status ---');
    console.log(`HTTP Status: ${accRes.status}`);
    console.log(`Friendly Name: ${accData.friendly_name}`);
    console.log(`Account Status: ${accData.status}`);
    console.log(`Account Type: ${accData.type}`);
  } catch (err: any) {
    console.error('Error checking account:', err.message);
  }

  // 2. Check Verified Caller IDs (Trial accounts can only send to verified numbers)
  let verifiedNumbers: string[] = [];
  try {
    const callerRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/OutgoingCallerIds.json`,
      { headers: { Authorization: authHeader } }
    );
    const callerData = await callerRes.json();
    console.log('\n--- Verified Caller IDs ---');
    if (callerData.outgoing_caller_ids && callerData.outgoing_caller_ids.length > 0) {
      verifiedNumbers = callerData.outgoing_caller_ids.map((c: any) => c.phone_number);
      console.log('Found verified numbers:', verifiedNumbers);
    } else {
      console.log('No verified caller IDs returned or list is empty.');
    }
  } catch (err: any) {
    console.error('Error checking caller IDs:', err.message);
  }

  // 3. Test sending an SMS if target phone provided or verified number found
  const cliTarget = process.argv[2];
  const targetPhone = cliTarget || (verifiedNumbers.length > 0 ? verifiedNumbers[0] : null);

  if (targetPhone && phone) {
    const formattedTarget = targetPhone.startsWith('+') ? targetPhone : `+91${targetPhone}`;
    console.log(`\n--- Attempting Test SMS to ${formattedTarget} ---`);

    const params = new URLSearchParams();
    params.append('To', formattedTarget);
    params.append('From', phone);
    params.append('Body', `[Partner Matching Platform] Test SMS: Your Twilio SMS integration is working successfully! Time: ${new Date().toLocaleTimeString()}`);

    try {
      const smsRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      );
      const smsData = await smsRes.json();
      console.log(`SMS HTTP Status: ${smsRes.status}`);
      if (smsRes.ok) {
        console.log('SUCCESS! SMS SID:', smsData.sid);
        console.log('Status:', smsData.status);
      } else {
        console.error('Twilio Error Code:', smsData.code);
        console.error('Twilio Error Message:', smsData.message);
        console.error('More Info:', smsData.more_info);
      }
    } catch (err: any) {
      console.error('SMS Send Error:', err.message);
    }
  } else {
    console.log('\nTo send a live test SMS, pass your verified phone number:');
    console.log('npx ts-node scripts/test-twilio-sms.ts +91XXXXXXXXXX');
  }
}

checkTwilio().catch(console.error);
