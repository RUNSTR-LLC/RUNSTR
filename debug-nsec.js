// Quick script to generate a valid test nsec for debugging
const { nip19, getPublicKey } = require('nostr-tools');

// Generate test keys
const privateKeyBytes = new Uint8Array(32);
for (let i = 0; i < 32; i++) {
  privateKeyBytes[i] = Math.floor(Math.random() * 256);
}

try {
  const publicKey = getPublicKey(privateKeyBytes);
  const nsec = nip19.nsecEncode(privateKeyBytes);
  const npub = nip19.npubEncode(publicKey);
  
  console.log('=== TEST NOSTR KEYS ===');
  console.log('nsec:', nsec);
  console.log('npub:', npub);
  console.log('nsec length:', nsec.length);
  console.log('nsec starts with nsec1:', nsec.startsWith('nsec1'));
  
  // Test validation
  console.log('\n=== VALIDATION TEST ===');
  const decoded = nip19.decode(nsec);
  console.log('decoded type:', decoded.type);
  console.log('decoded data length:', decoded.data.length);
  
} catch (error) {
  console.error('Error generating test keys:', error);
}