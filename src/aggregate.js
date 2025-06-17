import dotenv from 'dotenv';

import  { MongoClient } from 'mongodb';

dotenv.config({ silent: true });
const uri = process.env.MONGODB_URL;
async function performRemoteAggregation() {

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    const database = client.db("tvseries");
    const atvCollection = database.collection("atv");

    const pipeline = [
      {
        $lookup: {
          from: "wikidl",
          let: { atvTitle:   "$dizi.title" },
          pipeline: [
            { $match: 
              { $expr: 
                { $eq: [  "$dizi.title" , "$$atvTitle"] }
              }
            }
          ],
          as: "matchingShow"
        }
      },
      {
        $addFields: {
          bilgiler: { $arrayElemAt: ["$matchingShow.bilgiler", 0] }
        }
      },
      {
        $project: {
          matchingShow: 1
        }
      }
    ];

    const result = await atvCollection.aggregate(pipeline).toArray();
    console.log(`Retrieved ${result.length} merged documents`);
    debugger
    // Print the first merged document as an example
    if (result.length > 0) {
      console.log("First merged document:", JSON.stringify(result[0], null, 2));
    }

    return result;
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB Atlas");
  }
}

performRemoteAggregation().catch(console.error);