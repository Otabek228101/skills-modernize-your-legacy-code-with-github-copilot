const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const appPath = path.join(__dirname, 'index.js');

function runApp(input) {
  const result = spawnSync(process.execPath, [appPath], { encoding: 'utf8', input });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('COBOL-001: displays the full account menu and choice prompt at startup', () => {
  const output = runApp('4\n');

  for (const menuItem of [
    'Account Management System',
    '1. View Balance',
    '2. Credit Account',
    '3. Debit Account',
    '4. Exit',
    'Enter your choice (1-4):',
  ]) {
    assert.ok(output.includes(menuItem), `Expected startup output to include "${menuItem}"`);
  }
});

test('COBOL-002: displays the initial balance as 1000.00', () => {
  const output = runApp('1\n4\n');
  assert.match(output, /Current balance: 1000\.00/);
});

test('COBOL-003: credits a whole-dollar amount and shows it in a subsequent inquiry', () => {
  const output = runApp('2\n250\n1\n4\n');
  assert.match(output, /Amount credited\. New balance: 1250\.00/);
  assert.match(output, /Current balance: 1250\.00/);
});

test('COBOL-004: credits an amount with cents', () => {
  const output = runApp('2\n12.34\n1\n4\n');
  assert.match(output, /Amount credited\. New balance: 1012\.34/);
  assert.match(output, /Current balance: 1012\.34/);
});

test('COBOL-005: accepts a zero credit without changing the balance', () => {
  const output = runApp('2\n0\n1\n4\n');
  assert.match(output, /Amount credited\. New balance: 1000\.00/);
  assert.match(output, /Current balance: 1000\.00/);
});

test('COBOL-006: debits less than the balance and shows the updated balance', () => {
  const output = runApp('3\n125.50\n1\n4\n');
  assert.match(output, /Amount debited\. New balance: 874\.50/);
  assert.match(output, /Current balance: 874\.50/);
});

test('COBOL-007: allows debiting the exact balance and reaches 0.00', () => {
  const output = runApp('3\n1000.00\n1\n4\n');
  assert.match(output, /Amount debited\. New balance: 0\.00/);
  assert.match(output, /Current balance: 0\.00/);
});

test('COBOL-008: rejects an overdraft and leaves the balance unchanged', () => {
  const output = runApp('3\n1000.01\n1\n4\n');
  assert.match(output, /Insufficient funds for this debit\./);
  assert.match(output, /Current balance: 1000\.00/);
  assert.doesNotMatch(output, /Amount debited\./);
});

test('COBOL-009: accepts a zero debit without changing the balance', () => {
  const output = runApp('3\n0\n1\n4\n');
  assert.match(output, /Amount debited\. New balance: 1000\.00/);
  assert.match(output, /Current balance: 1000\.00/);
});

test('COBOL-010: applies multiple transactions to the latest balance', () => {
  const output = runApp('2\n200.00\n3\n75.25\n1\n4\n');
  assert.match(output, /Amount credited\. New balance: 1200\.00/);
  assert.match(output, /Amount debited\. New balance: 1124\.75/);
  assert.match(output, /Current balance: 1124\.75/);
});

test('COBOL-011: continues after an invalid menu choice and accepts the next choice', () => {
  const output = runApp('5\n1\n4\n');
  assert.match(output, /Invalid choice, please select 1-4\./);
  assert.match(output, /Current balance: 1000\.00/);
  assert.ok((output.match(/Account Management System/g) || []).length >= 2);
});

test('COBOL-012: exits with the goodbye message without displaying another menu', () => {
  const output = runApp('4\n');
  assert.match(output, /Exiting the program\. Goodbye!/);
  assert.equal((output.match(/Account Management System/g) || []).length, 1);
});

test('COBOL-013: resets the balance when a new application process starts', () => {
  const firstRun = runApp('2\n50.00\n4\n');
  const secondRun = runApp('1\n4\n');

  assert.match(firstRun, /Amount credited\. New balance: 1050\.00/);
  assert.match(secondRun, /Current balance: 1000\.00/);
});

test('rejects unsupported amount formats without changing the balance', () => {
  const output = runApp('2\n-10\n1\n4\n');
  assert.match(output, /Invalid amount\./);
  assert.match(output, /Current balance: 1000\.00/);
});
