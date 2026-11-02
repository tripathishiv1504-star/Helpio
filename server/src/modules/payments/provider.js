/**
 * PaymentProvider interface { charge(amount, meta) }
 * Default simulated provider that always succeeds, selectable by env PAYMENT_PROVIDER.
 */
export class SimulatedPaymentProvider {
  constructor() {
    this.name = 'simulated';
  }

  /**
   * Executes a simulated charge for the given amount.
   * @param {number} amount
   * @param {object} meta
   * @returns {Promise<{ success: boolean, transactionId: string, provider: string, amount: number, timestamp: Date }>}
   */
  async charge(amount, meta = {}) {
    return {
      success: true,
      transactionId: `sim_txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      provider: this.name,
      amount,
      meta,
      timestamp: new Date(),
    };
  }
}

/**
 * Factory to retrieve the configured PaymentProvider.
 */
export function getPaymentProvider() {
  const providerType = process.env.PAYMENT_PROVIDER || 'simulated';
  switch (providerType.toLowerCase()) {
    case 'simulated':
    default:
      return new SimulatedPaymentProvider();
  }
}

export default {
  SimulatedPaymentProvider,
  getPaymentProvider,
};
