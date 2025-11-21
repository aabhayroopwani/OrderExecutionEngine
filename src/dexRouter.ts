// src/dexRouter.ts

export class DexRouter {
  private basePrice = 100; // mock base price for all swaps

  // -----------------------------
  // QUOTE SIMULATIONS
  // -----------------------------
  async getRaydiumQuote(tokenIn: string, tokenOut: string, amount: number) {
    console.log("getting req");
    await this.sleep(2000);

    const price = this.basePrice * (0.98 + Math.random() * 0.04); // 2–4% variance
    const fee = 0.003; // 0.3%

    return { dex: "Raydium", price, fee };
  }

  async getMeteoraQuote(tokenIn: string, tokenOut: string, amount: number) {
    await this.sleep(2000);

    const price = this.basePrice * (0.97 + Math.random() * 0.05); // 3–5% variance
    const fee = 0.002; // 0.2%

    return { dex: "Meteora", price, fee };
  }

  // -----------------------------
  // MAIN EXECUTION ROUTER
  // -----------------------------
  async executeBestSwap(
    inputToken: string,
    outputToken: string,
    amount: number
  ) {
    // Validate token input for better error messages
    if (!inputToken || !outputToken || !amount) {
      throw new Error("Invalid swap parameters");
    }

    // Get quotes from both DEXs
    const [rQuote, mQuote] = await Promise.all([
      this.getRaydiumQuote(inputToken, outputToken, amount),
      this.getMeteoraQuote(inputToken, outputToken, amount),
    ]);

    // Log routing decision (important for your task requirements)
    console.log("\n[DEX ROUTER] --------------------------------");
    console.log(`[Quote] Raydium: ${rQuote.price.toFixed(4)}`);
    console.log(`[Quote] Meteora: ${mQuote.price.toFixed(4)}`);

    // Pick the best price (higher = better for selling input)
    const best =
      rQuote.price > mQuote.price ? { ...rQuote } : { ...mQuote };

    console.log(`[Routing Decision] Selected: ${best.dex}`);
    console.log("--------------------------------------------\n");

    // Simulate building / confirming a swap → 2–3 seconds delay
    await this.sleep(2000 + Math.random() * 1000);

    // Generate better mock tx hash
    const txHash = this.generateTxHash();

    return {
      dex: best.dex,
      executedPrice: Number(best.price.toFixed(6)),
      txHash,
    };
  }

  // -----------------------------
  // UTILS
  // -----------------------------

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateTxHash(): string {
    return "tx_" + [...Array(32)]
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join("");
  }
}
