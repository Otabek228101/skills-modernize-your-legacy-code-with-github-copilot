const readline = require('node:readline');

const INITIAL_BALANCE_CENTS = 100000;
const MAX_AMOUNT_CENTS = 99999999;

class AccountLedger {
  #balanceCents = INITIAL_BALANCE_CENTS;

  get balanceCents() {
    return this.#balanceCents;
  }

  credit(amountCents) {
    if (!Number.isInteger(amountCents) || amountCents < 0 || amountCents > MAX_AMOUNT_CENTS) {
      throw new RangeError('Credit amount must be between 0.00 and 999999.99.');
    }
    if (this.#balanceCents + amountCents > MAX_AMOUNT_CENTS) {
      throw new RangeError('Credit would exceed the maximum balance of 999999.99.');
    }
    this.#balanceCents += amountCents;
  }

  debit(amountCents) {
    if (!Number.isInteger(amountCents) || amountCents < 0 || amountCents > MAX_AMOUNT_CENTS) {
      throw new RangeError('Debit amount must be between 0.00 and 999999.99.');
    }
    if (this.#balanceCents < amountCents) {
      return false;
    }
    this.#balanceCents -= amountCents;
    return true;
  }
}

function parseAmountToCents(input) {
  const match = /^\d{1,6}(?:\.\d{1,2})?$/.exec(input.trim());
  if (!match) {
    return null;
  }

  const [wholePart, fractionalPart = ''] = input.trim().split('.');
  const amountCents = Number(wholePart) * 100 + Number(fractionalPart.padEnd(2, '0'));
  return amountCents <= MAX_AMOUNT_CENTS ? amountCents : null;
}

function formatCents(amountCents) {
  return `${Math.floor(amountCents / 100)}.${String(amountCents % 100).padStart(2, '0')}`;
}

async function runAccountingApp({ input = process.stdin, output = process.stdout } = {}) {
  const prompts = readline.createInterface({ input, output, terminal: Boolean(input.isTTY && output.isTTY) });
  const lines = prompts[Symbol.asyncIterator]();
  const ledger = new AccountLedger();

  async function ask(prompt) {
    output.write(prompt);
    const result = await lines.next();
    return result.done ? null : result.value;
  }

  async function askForAmount(action) {
    const inputAmount = await ask(`Enter ${action} amount: `);
    if (inputAmount === null) {
      return null;
    }
    const amountCents = parseAmountToCents(inputAmount);
    if (amountCents === null) {
      output.write('Invalid amount. Enter a non-negative amount up to 999999.99 with no more than two decimal places.\n');
      return undefined;
    }
    return amountCents;
  }

  try {
    while (true) {
      output.write('--------------------------------\n');
      output.write('Account Management System\n');
      output.write('1. View Balance\n');
      output.write('2. Credit Account\n');
      output.write('3. Debit Account\n');
      output.write('4. Exit\n');
      output.write('--------------------------------\n');

      const choice = await ask('Enter your choice (1-4): ');
      if (choice === null) {
        return;
      }

      switch (choice.trim()) {
        case '1':
          output.write(`Current balance: ${formatCents(ledger.balanceCents)}\n`);
          break;
        case '2': {
          const amountCents = await askForAmount('credit');
          if (amountCents === null) {
            return;
          }
          if (amountCents === undefined) {
            break;
          }
          try {
            ledger.credit(amountCents);
            output.write(`Amount credited. New balance: ${formatCents(ledger.balanceCents)}\n`);
          } catch (error) {
            if (!(error instanceof RangeError)) {
              throw error;
            }
            output.write(`${error.message}\n`);
          }
          break;
        }
        case '3': {
          const amountCents = await askForAmount('debit');
          if (amountCents === null) {
            return;
          }
          if (amountCents === undefined) {
            break;
          }
          if (ledger.debit(amountCents)) {
            output.write(`Amount debited. New balance: ${formatCents(ledger.balanceCents)}\n`);
          } else {
            output.write('Insufficient funds for this debit.\n');
          }
          break;
        }
        case '4':
          output.write('Exiting the program. Goodbye!\n');
          return;
        default:
          output.write('Invalid choice, please select 1-4.\n');
      }
    }
  } finally {
    prompts.close();
  }
}

if (require.main === module) {
  runAccountingApp().catch((error) => {
    console.error('The accounting application failed:', error);
    process.exitCode = 1;
  });
}

module.exports = { AccountLedger, formatCents, parseAmountToCents, runAccountingApp };
