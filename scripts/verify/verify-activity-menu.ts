/**
 * Verify activity menu implementation
 */
import { CATEGORY_MENU } from '../../src/types/activityMenu';

// Verify 3 categories
console.log(`Categories: ${CATEGORY_MENU.length} (expected 3) ${CATEGORY_MENU.length === 3 ? 'PASS' : 'FAIL'}`);

// Verify category names
const names = CATEGORY_MENU.map(c => c.label);
const expectedNames = ['Cardio', 'Strength', 'Wellness'];
const namesMatch = JSON.stringify(names) === JSON.stringify(expectedNames);
console.log(`Category names: ${names.join(', ')} ${namesMatch ? 'PASS' : 'FAIL'}`);

// Verify activity counts
const counts = CATEGORY_MENU.map(c => c.activities.length);
console.log(`Cardio activities: ${counts[0]} (expected 4) ${counts[0] === 4 ? 'PASS' : 'FAIL'}`);
console.log(`Strength activities: ${counts[1]} (expected 6) ${counts[1] === 6 ? 'PASS' : 'FAIL'}`);
console.log(`Wellness activities: ${counts[2]} (expected 7) ${counts[2] === 7 ? 'PASS' : 'FAIL'}`);

// Verify total
const total = counts.reduce((a, b) => a + b, 0);
console.log(`Total activities: ${total} (expected 17) ${total === 17 ? 'PASS' : 'FAIL'}`);

// Verify all activities have icons
let allHaveIcons = true;
for (const cat of CATEGORY_MENU) {
  for (const act of cat.activities) {
    if (!act.icon) {
      console.log(`FAIL: ${act.key} missing icon`);
      allHaveIcons = false;
    }
  }
}
console.log(`All activities have icons: ${allHaveIcons ? 'PASS' : 'FAIL'}`);

const passed = [
  CATEGORY_MENU.length === 3,
  namesMatch,
  counts[0] === 4,
  counts[1] === 6,
  counts[2] === 7,
  total === 17,
  allHaveIcons,
].filter(Boolean).length;

console.log(`\n${passed}/7 checks passed`);
process.exit(passed === 7 ? 0 : 1);
