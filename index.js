const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 3000;

const corsOptions = {
   origin: ["http://localhost:5173"],
   credentials: true,
   optionSuccessStatus: 200,
};

// middlewares:
app.use(cors(corsOptions));
app.use(express.json());

// for testing
app.get("/", (req, res) => {
   res.send("FlowTech is Running");
});

// listen
app.listen(port, () => {
   console.log(`FlowTech is running at port: ${port}`);
});
