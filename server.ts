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

app.get("/api/health", (_, res) => {
  res.json({
    health: "OK",
  });
});

app.listen(port, hostname, () => {
  console.log(`Attaching to http://${hostname}:${port}`);
});
