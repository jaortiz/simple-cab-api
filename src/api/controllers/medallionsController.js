import { Router } from "express";
import { resolve } from "path";

const router = Router();
const dbPath = resolve(__dirname, "../../db/ny_cab_data.db");
var sqlite3 = require("sqlite3").verbose();

router.get("/:medallionId", (req, res) => {
  const { medallionId } = req.params;
  const { date, noCache = false } = req.query;

  var db = new sqlite3.Database(dbPath, err => {
    if (err) console.log("Could not connect to databse", err); //should probably throw here but ehhh
  });

  //see if I can change this to db.each since db.all saves the entire thing to memory
  db.all(
    `SELECT pickup_datetime FROM cab_trip_data WHERE medallion='${medallionId}'`,
    (err, rows) => {
      if (err) {
        console.log(err);
      } else {
        let trips = 0;
        rows.forEach(row => {
          if (row.pickup_datetime.includes(date)) trips++;
        });
        res.send({ trips });
      }
    }
  );

  db.close(err => {
    if (err) console.error(err.message);
  });
});

export default router;
