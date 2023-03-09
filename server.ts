import express, { Express } from "express";

const app: Express = express();
const port = 9999;
const hostname = process.env.hostname || "0.0.0.0";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", (req, _, next) => {
  console.log("\n> Request URL:", req.originalUrl, "| Method:", req.method);
  next();
});

// Create question
app.post("/api/questions", (req, res) => {
    /* Validation
      - Ensure responder is a student
  */

  res.json("UNIMPLEMENTED");
  // Return created UUID

});

// Get question thread
app.get("/api/questions/:questionUUID", (req, res) => {
  res.json("UNIMPLEMENTED");
})

// Respond to question
app.post("/api/questions/:questionUUID/responses", (req, res) => {
  const uuid = req.params.questionUUID;
  
  /* Validation
    - Ensure question exists
    - Ensure responder is a mentor
  */
  

  res.json("UNIMPLEMENTED");
})

// Get questions UUIDs
app.get("/api/questions", (req, res) => {
  const questionUUIDs = [];
  res.json("UNIMPLEMENTED");
})


app.get("/api/health", (_, res) => {
  res.json({
    health: "OK",
  });
});

app.listen(port, hostname, () => {
  console.log(`Attaching to http://${hostname}:${port}`);
});
