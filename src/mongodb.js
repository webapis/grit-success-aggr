
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { Dataset } from 'crawlee';
dotenv.config({ silent: true });

const uri = process.env.MONGODB_URL;
const site = process.env.site

const dataset = await Dataset.open('tvseries');
const { items: data } = await dataset.getData()
console.log('uri-----', uri)
debugger

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

function turkishToLower(text) {
    const turkishChars = {
        'İ': 'i', 'I': 'ı', 'Ğ': 'ğ', 'Ü': 'ü', 'Ş': 'ş', 'Ö': 'ö', 'Ç': 'ç'
    };
    return text.replace(/[İIĞÜŞÖÇ]/g, char => turkishChars[char]).toLowerCase().trim();
}

async function main() {


    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const result = await bulkUpsertData(client, data);
        console.log(`Inserted/Updated ${result.upsertedCount + result.modifiedCount} documents`);

    } finally {

        await client.close();
    }
}

async function bulkUpsertData(client, data) {
    const bulkOps = data.map(m => { return { ...m,  TVSERIES_TITLE: turkishToLower(m.TVSERIES_TITLE) } }).map((doc) => ({
        updateOne: {
            filter: { _id: doc.TVSERIES_TITLE },
            update: { $set: doc },
            upsert: true
        }
    }));

    const result = await client.db('tvseries').collection(site).bulkWrite(bulkOps);
    return result;
}

main().catch(console.error);




