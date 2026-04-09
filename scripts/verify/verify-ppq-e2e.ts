/**
 * PPQ.AI End-to-End Verification Script
 *
 * Tests the PPQ.AI invoice creation flow:
 * 1. Checks current PPQ balance
 * 2. Creates a 100 sat topup invoice (minimum for Lightning)
 * 3. Prints the bolt11 invoice for manual payment
 * 4. Prints instructions for paying via Alby MCP
 *
 * Usage:
 *   PPQ_API_KEY=xxx npx tsx scripts/verify/verify-ppq-e2e.ts
 *   npx tsx scripts/verify/verify-ppq-e2e.ts <api-key>
 */

const PPQ_BASE_URL = 'https://api.ppq.ai';

function getApiKey(): string | null {
  // CLI argument takes precedence, then env var
  const fromArg = process.argv[2];
  const fromEnv = process.env.PPQ_API_KEY;
  return fromArg || fromEnv || null;
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

// Step 1: Check current PPQ balance
async function checkBalance(apiKey: string): Promise<boolean> {
  console.log('\n--- Step 1: Check PPQ.AI Balance ---');
  try {
    const response = await fetch(`${PPQ_BASE_URL}/credits/balance`, {
      method: 'GET',
      headers: authHeaders(apiKey),
    });

    if (!response.ok) {
      const body = await response.text();
      console.log(`FAIL: Balance check returned HTTP ${response.status}`);
      console.log(`  Response: ${body}`);
      if (response.status === 401 || response.status === 403) {
        console.log('  Hint: Your API key may be invalid or expired.');
      }
      return false;
    }

    const data = await response.json();

    // The balance endpoint may return a 404 message even on HTTP 200
    // if the path is wrong. Detect this and warn.
    if (data.message && data.message.includes('404')) {
      console.log('WARNING: Balance endpoint returned 404 in body (HTTP 200).');
      console.log('  The /credits/balance endpoint may have moved.');
      console.log(`  Response: ${JSON.stringify(data)}`);
      console.log('  Continuing to invoice creation...');
      return true;
    }

    console.log(`PASS: Balance retrieved successfully`);
    console.log(`  Response: ${JSON.stringify(data, null, 2)}`);
    return true;
  } catch (error) {
    console.log(`FAIL: Balance check failed: ${error instanceof Error ? error.message : error}`);
    console.log('  Hint: Is api.ppq.ai reachable? Check your network connection.');
    return false;
  }
}

// Step 2: Create a 100 sat topup invoice (minimum for Lightning)
async function createTopupInvoice(apiKey: string): Promise<string | null> {
  console.log('\n--- Step 2: Create 100 sat Topup Invoice ---');
  try {
    const response = await fetch(`${PPQ_BASE_URL}/topup/create/btc-lightning`, {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify({ amount: 100, currency: 'SATS' }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.log(`FAIL: Invoice creation returned HTTP ${response.status}`);
      console.log(`  Response: ${body}`);
      return null;
    }

    const data = await response.json();
    console.log(`PASS: Invoice created successfully`);
    console.log(`  Full response: ${JSON.stringify(data, null, 2)}`);

    // Extract the bolt11 invoice - try common response shapes
    const bolt11 = data.lightning_invoice || data.invoice || data.payment_request || data.bolt11 || data.pr || null;
    if (!bolt11) {
      console.log('  WARNING: Could not extract bolt11 string from response.');
      console.log('  The invoice may be nested in the response - inspect the JSON above.');
      return null;
    }

    return bolt11;
  } catch (error) {
    console.log(`FAIL: Invoice creation failed: ${error instanceof Error ? error.message : error}`);
    console.log('  Hint: Is api.ppq.ai reachable? Check your network connection.');
    return null;
  }
}

// Step 3: Print invoice and payment instructions
function printPaymentInstructions(bolt11: string, apiKey: string): void {
  console.log('\n--- Step 3: Lightning Invoice ---');
  console.log(`\nBolt11 Invoice:\n${bolt11}`);

  console.log('\n--- Step 4: Pay via Alby MCP ---');
  console.log('Copy and paste this into Claude to pay the invoice:');
  console.log(`\n  mcp__alby__pay_invoice({ invoice: "${bolt11}" })`);

  console.log('\n--- Step 5: Verify Balance After Payment ---');
  console.log('After paying, check your updated balance with:');
  console.log(`\n  curl -s -H "Authorization: Bearer ${apiKey}" ${PPQ_BASE_URL}/credits/balance | python3 -m json.tool`);
}

async function main() {
  console.log('PPQ.AI End-to-End Verification');
  console.log('================================');

  // Get API key
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log('\nFAIL: No API key provided.');
    console.log('Usage:');
    console.log('  PPQ_API_KEY=xxx npx tsx scripts/verify/verify-ppq-e2e.ts');
    console.log('  npx tsx scripts/verify/verify-ppq-e2e.ts <api-key>');
    process.exit(1);
  }

  console.log(`API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);

  // Step 1: Check balance
  const balanceOk = await checkBalance(apiKey);
  if (!balanceOk) {
    console.log('\nBalance check failed. Cannot proceed with invoice creation.');
    console.log('Fix the issue above and try again.');
    process.exit(1);
  }

  // Step 2: Create invoice
  const bolt11 = await createTopupInvoice(apiKey);
  if (!bolt11) {
    console.log('\nInvoice creation failed or bolt11 could not be extracted.');
    console.log('Check the response above for details.');
    process.exit(1);
  }

  // Steps 3-5: Print instructions
  printPaymentInstructions(bolt11, apiKey);

  console.log('\n================================');
  console.log('Verification complete. Invoice created but NOT paid.');
  console.log('Pay manually using the Alby MCP command above, then check balance.');
}

main();
