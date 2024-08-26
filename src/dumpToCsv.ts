import { createObjectCsvWriter } from "csv-writer";
import { initializeApp } from "firebase/app";
import {
  collection,
  getDocs,
  getFirestore,
} from "firebase/firestore";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.FB_API_KEY,
  authDomain: process.env.FB_AUTH_DOMAIN,
  projectId: process.env.FB_PROJECT_ID,
  storageBucket: process.env.FB_STORAGE_BUCKET,
  messagingSenderId: process.env.FB_MESSAGING_SENDER_ID,
  appId: process.env.FB_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchCollectionAndWriteToCSV(outputFileName: string) {
  const outputPath = path.join(__dirname, outputFileName);
  try {
    // Fetch all documents from the specified collection
    const snapshot = await getDocs(
      collection(db, `projects/${process.env.FUNDRAISER_ID}/contributors`)
    );

    console.log(snapshot.docs);

    if (snapshot.empty) {
      console.log("No documents found in the collection.");
      return;
    }

    // Extract field names from the first document
    const firstDoc = snapshot.docs[0].data();
    const headers = Object.keys(firstDoc).map((key) => ({
      id: key,
      title: key,
    }));

    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: headers,
    });

    const records = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    await csvWriter.writeRecords(records);

    console.log(`Data has been written to ${outputPath}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

fetchCollectionAndWriteToCSV("contributors.csv");
