const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
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
      const peopleCollection = client.db("flowTech").collection("people");
      const worksCollection = client.db("flowTech").collection("works");

      /********** JWT Related APIs ************/

      // Create a token against a user email
      app.post("/jwt", async (req, res) => {
         const user = req.body;
         const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "7d",
         });
         res.send({ token });
      });

      // middlewares:
      // const verifyToken = (req, res, next) => {
      //    console.log(
      //       "from middleware verify token: ",
      //       req.headers.authorization
      //    );

      //    if (!req.headers.authorization) {
      //       return res.status(401).send({ message: "Unauthorized Access" });
      //    }

      //    const token = req.headers.authorization.split(" ")[1];

      //    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      //       if (err) {
      //          return res.status(401).send({ message: "Unauthorized Access" });
      //       }

      //       req.decoded = decoded;

      //       next();
      //    });
      // };

      // use verify admin after verifyToken
      // const verifyAdmin = async (req, res, next) => {
      //    const email = req.decoded.email;
      //    const query = { email: email };
      //    const user = await userCollection.findOne(query);
      //    const isAdmin = user?.role === "admin";
      //    if (!isAdmin) {
      //       return res.status(403).send({ message: "forbidden access" });
      //    }
      //    next();
      // };

      /***** people RELATED APIs *****/

      app.get("/people", async (req, res) => {
         const result = await peopleCollection.find().toArray();
         res.send(result);
      });

      app.post("/people", async (req, res) => {
         const data = req.body;
         const email = data.email;
         const query = { email: email };
         const isExist = await peopleCollection.findOne(query);
         console.log(isExist);
         if (isExist) {
            return res.send(isExist);
         }
         const result = await peopleCollection.insertOne(data);
         res.send(result);
      });

      /********** WORK Related APIs ************/

      // add a work by an employee
      app.post("/works", async (req, res) => {
         const data = req.body;
         const result = await worksCollection.insertOne(data);
         res.send(result);
      });

      // get work data based on user email
      app.get("/works/:email", async (req, res) => {
         const email = req.params.email;
         const query = { employee: email };
         const result = await worksCollection
            .find(query)
            .sort({ workDate: -1 })
            .toArray();
         res.send(result);
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
