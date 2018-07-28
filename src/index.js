import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import routes from "./api/routes";

const app = express();

app.use(bodyParser.json({ type: "application/json" }));
app.use(cors());
app.use("/api", routes);

const port = 8000;
app.listen(port, () => {
  console.log("Server started on port: " + port);
});
