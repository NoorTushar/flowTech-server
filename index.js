const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
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

// send email
const sendEmail = (emailAddress, emailData) => {
   const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Use `true` for port 465, `false` for all other ports
      auth: {
         user: process.env.TRANSPORTER_EMAIL,
         pass: process.env.TRANSPORTER_PASS,
      },
   });

   // verify transporter
   // verify connection configuration
   transporter.verify(function (error, success) {
      if (error) {
         console.log(error);
      } else {
         console.log("Server is ready to take our messages");
      }
   });
   const mailBody = {
      from: `"FlowTech" <${process.env.TRANSPORTER_EMAIL}>`, // sender address
      to: emailAddress, // list of receivers
      subject: emailData.subject, // Subject line
      html: emailData.message, // html body
   };

   transporter.sendMail(mailBody, (error, info) => {
      if (error) {
         console.log(error);
      } else {
         console.log("Email Sent: " + info.response);
      }
   });
};

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
      const paymentCollection = client.db("flowTech").collection("payments");
      const firedPeopleCollection = client
         .db("flowTech")
         .collection("firedPeople");

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

      // test email

      app.get("/test-email", async (req, res) => {
         sendEmail("noor.tushar.khan@gmail.com", {
            subject: "Booking Successful",
            message: `<p>Hello There! Thank you for messaging us.</p>`,
         });
      });

      /***** people RELATED APIs *****/

      app.get("/people", async (req, res) => {
         const result = await peopleCollection.find().toArray();
         res.send(result);
      });

      // get only the verified employees
      app.get("/verified-people", async (req, res) => {
         const query = { verified: true };
         const result = await peopleCollection.find(query).toArray();
         res.send(result);
      });

      // find a employee using email
      app.get("/people/:email", async (req, res) => {
         const email = req.params.email;
         const query = { email: email };
         const result = await peopleCollection.findOne(query);
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

      // fire an employee and also add him/her to firedPeople collection
      app.patch("/firePeople/:email", async (req, res) => {
         const email = req.params.email;

         try {
            const query = { email: email };
            const employee = await peopleCollection.findOne(query);
            // first we add him to the firePeople collection
            const addToFirePeople = await firedPeopleCollection.insertOne(
               employee
            );

            if (!addToFirePeople.acknowledged) {
               return res.status(500).send({
                  message: "Failed to add employee to firedPeople collection",
               });
            }

            // then we change his status to fire from people collection
            const updateDoc = {
               $set: {
                  role: "fired",
               },
            };

            const fireEmployee = await peopleCollection.updateOne(
               query,
               updateDoc
            );

            if (fireEmployee.modifiedCount === 0) {
               return res.status(500).send({
                  message: "Failed to delete employee from people collection",
               });
            }

            res.send({
               message: "Employee fired and added to firedPeople collection",
               addToFirePeople,
               fireEmployee,
            });
         } catch (error) {
            console.log(`error in delete people api`);
            res.status(500).send({
               message: "Internal Server Error While Firing Employee",
            });
         }
      });

      // make an employee a HR
      app.patch("/makeHR/:email", async (req, res) => {
         const email = req.params.email;

         try {
            const query = { email: email };
            const updateDoc = {
               $set: {
                  role: "hr",
               },
            };
            const result = await peopleCollection.updateOne(query, updateDoc);
            res.send({
               message: "Made HR!",
               result,
            });
         } catch (error) {
            console.log(`error in makeHR api`);
            res.status(500).send({
               message: "Internal Server Error While Firing Employee",
            });
         }
      });

      app.patch("/update-salary", async (req, res) => {
         const user = req?.body;
         console.log(user);
         try {
            const query = { email: user?.email };
            const updateDoc = {
               $set: {
                  salary: user?.amount,
               },
            };
            const result = await peopleCollection.updateOne(query, updateDoc);
            res.send({
               message: "Salary Increased!",
               result,
            });
         } catch (error) {
            console.log(`error in Increasing Salary api`);
            res.status(500).send({
               message: "Internal Server Error While Increasing Salary",
            });
         }
      });

      // update verified to false or true
      app.patch("/people/:email", async (req, res) => {
         const email = req.params.email;
         const user = req.body.verified;

         const query = { email: email };
         const options = { upsert: true };
         const updateDoc = {
            $set: {
               verified: user,
            },
         };

         const result = await peopleCollection.updateOne(
            query,
            updateDoc,
            options
         );

         res.send(result);
      });

      /********** WORK Related APIs ************/

      // add a work by an employee
      app.post("/works", async (req, res) => {
         const data = req.body;
         const result = await worksCollection.insertOne(data);

         res.send(result);
      });

      // get all works
      app.get("/works", async (req, res) => {
         const name = req.query.name;
         const month = req.query.month;
         console.log(name);
         let filter = {};
         if (name) {
            filter = { employeeName: name };
         }

         const worksPipeline = [
            {
               $addFields: {
                  month: {
                     $dateToString: {
                        format: "%m",
                        date: { $toDate: "$workDate" },
                     },
                  },
               },
            },
            {
               // Match documents where the "month" field matches the provided month value
               $match: {
                  ...filter,
                  ...(month && { month: month }), // Add month to the filter if provided
               },
            },
            {
               $project: {
                  month: 0,
               },
            },
         ];

         const works = await worksCollection.aggregate(worksPipeline).toArray();

         // aggregate pipe line to get unique names
         const uniqueNames = await worksCollection
            .aggregate([
               {
                  $group: {
                     _id: "$employeeName",
                  },
               },
               {
                  $project: {
                     _id: 0,
                     employeeName: "$_id",
                  },
               },
            ])
            .toArray();

         res.send({ works, uniqueNames });
      });

      // get work data based on user email
      app.get("/works/:email", async (req, res) => {
         const email = req.params.email;
         const query = { employeeEmail: email };
         const result = await worksCollection
            .find(query)
            .sort({ workDate: -1 })
            .toArray();
         res.send(result);
      });

      /********** Payment Related APIs ************/
      app.post("/pay", async (req, res) => {
         const data = req.body;

         // Check if a payment exists for the same employee and month
         const existingPayment = await paymentCollection.findOne({
            email: data.email,
            month: data.month,
            year: data.year,
         });

         if (existingPayment) {
            // If a payment exists for the same employee and month, return an error
            return res.send({ message: "payment already made" });
         }

         // If no existing payment, insert the payment data into the database
         const result = await paymentCollection.insertOne(data);
         res.send(result);
      });

      // find pay history for a single user
      app.get("/pay/:email", async (req, res) => {
         const email = req.params.email;
         const query = { email: email };

         // Assuming 'month' and 'year' are stored as strings and need to be combined and sorted
         // You can use a pipeline to sort by year and month
         const result = await paymentCollection
            .aggregate([
               { $match: query },
               {
                  $addFields: {
                     yearInt: { $toInt: "$year" },
                     monthInt: {
                        $indexOfArray: [
                           [
                              "January",
                              "February",
                              "March",
                              "April",
                              "May",
                              "June",
                              "July",
                              "August",
                              "September",
                              "October",
                              "November",
                              "December",
                           ],
                           "$month",
                        ],
                     },
                  },
               },
               { $sort: { yearInt: -1, monthInt: -1 } },
               { $project: { yearInt: 0, monthInt: 0 } }, // Remove temporary fields from the result
            ])
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
