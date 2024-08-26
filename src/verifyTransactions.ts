import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { createObjectCsvWriter } from "csv-writer";
import {
  Connection,
  clusterApiUrl,
  TransactionSignature,
} from "@solana/web3.js";
import dotenv from "dotenv";
import { sleep } from "./utils/sleep";

dotenv.config();

async function verifyTransactionsFromCSV(
  inputFileName: string,
  outputFileName: string
) {
  const inputFilePath = path.join(__dirname, inputFileName);
  const outputFilePath = path.join(__dirname, outputFileName);

  const connection = new Connection(
    process.env.RPC ? process.env.RPC : clusterApiUrl("mainnet-beta")
  );
  const results: any[] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(inputFilePath)
      .pipe(csv())
      .on("data", async (data) => {
        results.push(data);
      })
      .on("end", async () => {
        const batchSize = 10;
        const delayBetweenBatches = 1000;
        const verifiedResults = [];
        let totalAmount = 0;

        for (let i = 0; i < results.length; i += batchSize) {
          const batch = results.slice(i, i + batchSize);
          const batchPromises = batch.map(async (row) => {
            let verified = false;
            try {
              totalAmount += parseFloat(row.amount);
              const signature = row.hash as TransactionSignature;
              const transaction = await connection.getTransaction(signature, {
                maxSupportedTransactionVersion: 0,
              });
              // Transaction succeeded if it exists and has no error
              verified = transaction !== null && transaction.meta?.err === null;
            } catch (error) {
              console.error(`Error fetching transaction ${row.hash}:`, error);
            }
            return {
              ...row,
              verified: verified.toString(),
            };
          });

          const batchResults = await Promise.all(batchPromises);
          verifiedResults.push(...batchResults);

          console.log(
            `Processed ${i + batchSize} out of ${results.length} transactions`
          );

          if (i + batchSize < results.length) {
            await sleep(delayBetweenBatches);
          }
        }

        const headers = [
          ...Object.keys(verifiedResults[0]).map((key) => ({
            id: key,
            title: key,
          })),
          { id: "verified", title: "Verified" },
        ];

        const csvWriter = createObjectCsvWriter({
          path: outputFilePath,
          header: headers,
        });

        await csvWriter.writeRecords(verifiedResults);
        console.log(`Verified data has been written to ${outputFilePath}`);
        console.log(`Sum of contributions: ${totalAmount}`);
        resolve(true);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

verifyTransactionsFromCSV("contributors.csv", "verified.csv");
