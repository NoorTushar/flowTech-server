// Get works by employee name and month
app.get("/works", async (req, res) => {
   const name = req.query.name;
   const month = req.query.month; // Get the month from the query parameters

   console.log(name, month);

   // Build the filter object based on the query parameters
   let filter = {};
   if (name) {
      filter.employeeName = name;
   }

   try {
      // Use MongoDB aggregation pipeline to filter documents by month and employee name
      const worksPipeline = [
         {
            // Add a new field "month" to each document by extracting the month from "workDate"
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
            // Exclude the "month" field from the final result
            $project: {
               month: 0,
            },
         },
      ];

      const works = await worksCollection.aggregate(worksPipeline).toArray(); // Convert the aggregation result to an array

      // Aggregate pipeline to get unique employee names
      const uniqueNamesPipeline = [
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
      ];

      const uniqueNames = await worksCollection
         .aggregate(uniqueNamesPipeline)
         .toArray();

      // Send the filtered documents and unique names as the response
      res.send({ works, uniqueNames });
   } catch (error) {
      // Log any errors that occur during the query
      console.error("Error fetching data:", error);
      // Send an error response with a 500 status code
      res.status(500).send({ error: "Internal server error" });
   }
});
