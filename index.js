const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 3000;

// const corsOptions = {
//    origin: ["http://localhost:5173"],
//    credentials: true,
//    optionSuccessStatus: 200,
// };

// middlewares:
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j7c4zww.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   },
});

async function run() {
   try {
      const usersCollection = client.db("flowTech").collection("users");

      /***** USER RELATED APIs *****/
      app.put("/users", async (req, res) => {
         const user = req.body; // Extract user data from the request body
         const query = { email: user?.email }; // Create a query object using the user's email

         // Check if the user already exists in the database
         const isExist = await usersCollection.findOne(query);
         if (isExist) {
            // If the user exists and is trying to change their status to "Requested"
            if (user.status === "Requested") {
               // Update the user's status in the database
               const result = await usersCollection.updateOne(query, {
                  $set: { status: user?.status },
               });
               return res.send(result); // Return the result of the update operation
            } else {
               // If the user exists and is not changing their status, return the existing user data
               return res.send(isExist);
            }
         }

         // If the user does not exist, save the user data for the first time
         const options = { upsert: true }; // Set the upsert option to true
         const updateDoc = {
            $set: {
               ...user, // Spread the user data into the update document
               timestamp: Date.now(), // Add a timestamp field with the current date and time
            },
         };
         // Perform the update operation with upsert option (inserts a new document if no matching document is found)
         const result = await usersCollection.updateOne(
            query,
            updateDoc,
            options
         );
         res.send(result); // Return the result of the update operation
      });

      console.log(
         "Pinged your deployment. You successfully connected to MongoDB!"
      );
   } finally {
      // Ensures that the client will close when you finish/error
      //   await client.close();
   }
}
run().catch(console.dir);

// for testing
app.get("/", (req, res) => {
   res.send("FlowTech is Running");
});

// listen
app.listen(port, () => {
   console.log(`FlowTech is running at port: ${port}`);
});
