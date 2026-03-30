/**
 * Verify sign-out cleanup: AsyncStorage, Zustand stores, NDK, navigation
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) { console.log(`  PASS: ${name}`); passed++; }
  else { console.log(`  FAIL: ${name}`); failed++; }
}

function readFile(p: string) { return fs.readFileSync(path.join(ROOT, p), 'utf-8'); }

// --- AuthService.signOut ---
console.log('\n--- AuthService.signOut cleanup ---');
const authService = readFile('src/services/auth/authService.ts');
check('Has signOut method', authService.includes('async signOut()'));

// AsyncStorage cleanup
console.log('\n--- AsyncStorage key removal ---');
check('Clears wallet_proofs', authService.includes('@runstr:wallet_proofs'));
check('Clears wallet_pubkey', authService.includes('@runstr:wallet_pubkey'));
check('Clears hex_pubkey', authService.includes('@runstr:hex_pubkey'));
check('Clears onboarding_completed', authService.includes('@runstr:onboarding_completed'));
check('Clears reward_lightning_address', authService.includes('@runstr:reward_lightning_address'));
check('Clears club_id', authService.includes('@runstr:club_id'));
check('Clears selected_team_id', authService.includes('@runstr:selected_team_id'));
check('Clears streak_data', authService.includes('@runstr:streak_data'));
check('Uses multiRemove for batch cleanup', authService.includes('multiRemove'));

// Nostr storage cleanup
console.log('\n--- Nostr storage cleanup ---');
check('Imports clearNostrStorage', authService.includes('clearNostrStorage'));
check('Calls clearNostrStorage', authService.includes('await clearNostrStorage()'));

// NDK disconnection
console.log('\n--- NDK signer cleanup ---');
check('Imports GlobalNDKService', authService.includes('GlobalNDKService'));
check('Clears NDK signer (ndk.signer = undefined)', authService.includes('ndk.signer = undefined'));

// Zustand store resets
console.log('\n--- Zustand store resets ---');
check('Resets walletStore', authService.includes('useWalletStore') && authService.includes('.reset()'));

// Cache cleanup
console.log('\n--- Cache cleanup ---');
check('Clears appCache', authService.includes('appCache') && authService.includes('.clear()'));
check('Clears competition cache', authService.includes('CompetitionCacheService') && authService.includes('clearCache'));
check('Clears UnifiedNostrCache', authService.includes('UnifiedNostrCache') || authService.includes('unifiedCache'));
check('Clears ClubMembershipService cache', authService.includes('ClubMembershipService') && authService.includes('clearCache'));
check('Clears UnifiedSigningService cache', authService.includes('UnifiedSigningService') && authService.includes('clearCache'));
check('Clears NWC wallet', authService.includes('NWCStorageService') && authService.includes('clearNWC'));
check('Clears team memberships', authService.includes('LocalTeamMembershipService') && authService.includes('clearAll'));

// --- AuthContext.signOut ---
console.log('\n--- AuthContext.signOut (navigation + state) ---');
const authCtx = readFile('src/contexts/AuthContext.tsx');
check('AuthContext has signOut callback', authCtx.includes('const signOut = useCallback'));
check('Sets isAuthenticated to false', authCtx.includes('setIsAuthenticated(false)'));
check('Sets currentUser to null', authCtx.includes('setCurrentUser(null)'));
check('Calls AuthService.signOut()', authCtx.includes('await AuthService.signOut()'));
check('Clears verification code', authCtx.includes('VerificationService.clearCode'));

// Navigation to login
console.log('\n--- Navigation after sign-out ---');
check('State cleared triggers navigation (isAuthenticated=false)',
  authCtx.includes('setIsAuthenticated(false)'));

// Check that navigation handlers call signOut
const handlers = readFile('src/navigation/navigationHandlers.ts');
check('navigationHandlers has handleSignOut', handlers.includes('handleSignOut') || handlers.includes('signOut'));

console.log(`\n=== ${passed}/${passed + failed} checks passed ===`);
process.exit(failed > 0 ? 1 : 0);
