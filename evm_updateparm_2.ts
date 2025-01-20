import {
  EvmParams,
  RESTClient,
  MnemonicKey,
  MsgUpdateEvmParams,
  Wallet,
  MsgExecuteMessages,
} from "@initia/initia.js";

/**
 * main() demonstrates how to update EVM-related chain parameters (such as fee denom, allowed publishers, etc.).
 * Note: This requires the mnemonic for the chain’s operator(a.k.a validator), which you must obtain from the chain administrator.
 */
async function main() {
  /**
   * 1) Instantiate a RESTClient using the chain’s RPC endpoint.
   *    - The first argument is the base URL or RPC endpoint of your chain.
   *    - The second argument is an object providing client options like gas prices.
   *
   *    For example:
   *    "https://maze-rpc-sequencer-fd70c395-4cfc-4624-ab8a-8e025af6a140.ane1-prod-nocsm.newmetric.xyz/" 
   *    is a special endpoint in this context (provided by NewMetric).
   */
  const client = new RESTClient(
    "http://156.225.28.102:1317", 
    {
      /**
       * gasPrices: '0GAS'
       *   - This can be set to '0GAS' if the chain you’re using allows 0 gas prices or free transactions
       *     for certain operations (testnet or specific config).
       *   - In production or other networks, you usually set this to something like "0.025<feeDenom>" or
       *     whatever fee denom and minimum gas price the network expects.
       */
      gasPrices: '0GAS', // this should be current gas denom
    }
  );

  /**
   * 2) Create a Wallet instance using the client and a MnemonicKey.
   *    - The MnemonicKey is derived from the chain operator's mnemonic (private key).
   *    - This wallet has permission to execute the EVM parameter update because it’s
   *      presumably the authorized validator or has the necessary roles on the chain.
   */
  const wallet = new Wallet(
    client,
    new MnemonicKey({
      /**
       * Replace with the actual mnemonic of the chain operator or the account with
       * the authority to update EVM params. 
       * Make sure you keep this mnemonic secret.
       */
      mnemonic: "choice laundry chef improve certain cheap will animal law furnace eight season across reform young cannon giggle keep anger daughter trigger double magnet join" // enter validator mnemonic

    })
  );

  /**
   * 3) Construct the MsgUpdateEvmParams message.
   *    - This message tells the chain which parameters to update in the EVM module.
   *    - The first argument is the "opchild module address" or "authority address" (in bech32 format).
   *      This is the authority that is allowed to update the EVM params on chain.
   *      This is obtained from `/cosmos/auth/v1beta1/module_accounts/opchild` endpoint.
   *
   *    - Then we instantiate a new EvmParams object:
   *      @param extra_eip (array): Optional EIPs to enable
   *      @param allowed_publisher (array): Entities allowed to publish certain EVM data
   *      @param allow_custom_erc20 (boolean): Toggle for custom ERC20 tokens
   *      @param allowed_custom_erc20s (array): A list of allowed custom ERC20 addresses 
   *                                            (could be 0x or bech32, depending on chain config)
   *      @param fee_denom (string): The fee denomination on-chain (e.g. 'umin'). 
   *                                 It typically should match the chain’s native fee token.
   *      @param gas_refund_ratio (string): The gas refund ratio for the chain.
   *      @param num_retain_block_hashes (number): The number of block hashes to retain.
   */
  const msgs = [
    new MsgUpdateEvmParams(
      "init1gz9n8jnu9fgqw7vem9ud67gqjk5q4m2w0aejne", // Authority/Opchild module address (don't change)
      new EvmParams(
        [], // extra_eip - e.g. ["EIP1559"] if needed
        [], // allowed_publisher - e.g. ['0x123...'] if you want certain publishers
        /**
         * allow_custom_erc20 (boolean)
         * - Determines whether custom ERC20 tokens are allowed beyond the default token factory.
         *
         *   - If true and allowed_custom_erc20s = []:
         *       => All custom ERC20 tokens are allowed.
         *
         *   - If true and allowed_custom_erc20s = [addr1, addr2]:
         *       => Only the tokens specified in the list [addr1, addr2] are allowed.
         *
         *   - If false and allowed_custom_erc20s = []:
         *       => Only tokens created by the chain's token factory are allowed; no arbitrary custom tokens.
         */
        true,
        /**
         * allowed_custom_erc20s (string[])
         * - A list of custom ERC20 addresses (0x or bech32, depending on your chain) that are permitted.
         * - This array must be considered in conjunction with allow_custom_erc20 (above).
         * - If allow_custom_erc20 = true but this is empty => all custom ERC20 tokens are allowed.
         * - If allow_custom_erc20 = true and you specify addresses => only those addresses are allowed.
         */
        [],
        /**
         * fee_denom (string)
         * - Must be the chain's fee token; often in the format `evm/<erc20Address>` 
         *   on an EVM-compatible chain.
         * - Example: "evm/9D9c32921575Fd98e67E27C0189ED4b750Cb17C5"
         */
        "evm/137fDE729e22c911331EA5B3ACaaf476B93E93cA", // this will be new gas denom
        
        /**
         * gas_refund_ratio (string)
         */
        '500000000000000000',
        /**
         * num_retain_block_hashes (number)
         */
        0 
      )
    )
  ];

  /**
   * 4) Create a MsgExecuteMessages message to execute the EVM parameter update.
   *    - This message will include the MsgUpdateEvmParams message(s) we created above.
   *    - The first argument is the wallet’s (validator’s) account address.
   *    - The second argument is an array of messages to execute.
   */
  const executeMsg = new MsgExecuteMessages(
    wallet.key.accAddress, // must be admin address
    msgs
  )

  /**
   * 5) Create and sign the transaction with the Wallet.
   *    - This will create a transaction that includes the EVM param update message
   *      and then sign it using the wallet’s (validator’s) private key.
   */
  const signedTx = await wallet.createAndSignTx({
    msgs: [executeMsg],
  });

  /**
   * 6) Broadcast the transaction to the chain’s REST endpoint.
   *    - This sends the signed transaction to be processed on-chain,
   *      where it will update the EVM parameters if everything is valid.
   */
  console.log("Sending transaction:", Buffer.from(signedTx.toBytes()) );
  await client.tx.broadcast(signedTx);
}

/**
 * Finally, run the main() function.
 */
main();