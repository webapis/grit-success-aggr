import dotenv from 'dotenv';

import { MongoClient } from 'mongodb';
import fs from 'fs'
dotenv.config({ silent: true });
const uri = process.env.MONGODB_URL;


async function bulkTurkishLowercaseTitles({ colName }) {

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");

        const database = client.db("tvseries");
        const collection = database.collection(colName);
        const data = await collection.find({}).toArray();

        fs.writeFileSync(`${process.cwd()}/data/${colName}.json`, JSON.stringify(data))


    } finally {
        await client.close();
        console.log("Disconnected from MongoDB Atlas");
    }
}



for (let colName of ["atv", "kanal7", "kanald", "nowtv", "showtv", "startv", "trt1", "wikidl","medyapim"]) {
    bulkTurkishLowercaseTitles({ colName }).catch(console.error);
}