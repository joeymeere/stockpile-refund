import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import fs from "fs";
import csv from "csv-parser";
import path from "path";
import dotenv from "dotenv";
import bs58 from "bs58";

dotenv.config();

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

async function transferUSDCFromCSV(csvFileName: string) {
  const connection = new Connection(
    process.env.RPC ? process.env.RPC : clusterApiUrl("mainnet-beta")
  );

  const privateKey = bs58.decode(process.env.PRIVATE_KEY);
  const fromWallet = Keypair.fromSecretKey(privateKey);

  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromWallet,
    USDC_MINT,
    fromWallet.publicKey
  );

  const results: any[] = [];
  const csvFilePath = path.join(__dirname, csvFileName);

  // Read the CSV file
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", resolve)
      .on("error", reject);
  });

  for (const row of results) {
    if (row.verified === "true") {
      const amount = parseFloat(row.amount);
      const toUserId = row.userId;

      if (isNaN(amount) || !toUserId) {
        console.error(
          `Invalid amount or userId for row: ${JSON.stringify(row)}`
        );
        continue;
      }

      try {
        const toPublicKey = new PublicKey(toUserId);

        const toTokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          fromWallet,
          USDC_MINT,
          toPublicKey
        );

        const transaction = new Transaction().add(
          createTransferInstruction(
            fromTokenAccount.address,
            toTokenAccount.address,
            fromWallet.publicKey,
            amount * Math.pow(10, 6)
          )
        );

        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [fromWallet]
        );

        console.log(
          `Transferred ${amount} USDC to ${row.username} at ${toUserId}. Signature: ${signature}`
        );
      } catch (error) {
        console.error(`Error transferring to ${toUserId}:`, error);
      }
    } else {
      console.log(`${row.username} did not make a verified contribution.`);
    }
  }
}

transferUSDCFromCSV("verified.csv");
