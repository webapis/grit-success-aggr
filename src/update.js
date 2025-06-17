import dotenv from 'dotenv';

import  { MongoClient } from 'mongodb';

dotenv.config({ silent: true });
const uri = process.env.MONGODB_URL;
function turkishToLower(text) {
    const turkishChars = {
        'İ': 'i', 'I': 'ı', 'Ğ': 'ğ', 'Ü': 'ü', 'Ş': 'ş', 'Ö': 'ö', 'Ç': 'ç'
    };
    return text.replace(/[İIĞÜŞÖÇ]/g, char => turkishChars[char]).toLowerCase().trim();
}

async function bulkTurkishLowercaseTitles() {

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");

        const database = client.db("tvseries");
        const collection = database.collection("wikidl");

        const cursor = collection.find({});
        let updatedCount = 0;

        for await (const doc of cursor) {
            if (doc.dizi && doc.dizi.title) {
                const lowercaseTitle = turkishToLower(doc.dizi.title);
                if (lowercaseTitle !== doc.dizi.title) {
                    await collection.updateOne(
                        { _id: doc._id },
                        { $set: { "dizi.title": lowercaseTitle } }
                    );
                    updatedCount++;
                }
            }
        }

        console.log(`Updated ${updatedCount} documents`);

    } finally {
        await client.close();
        console.log("Disconnected from MongoDB Atlas");
    }
}

bulkTurkishLowercaseTitles().catch(console.error);