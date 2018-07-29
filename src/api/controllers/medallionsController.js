import { Router } from "express";
import { resolve } from "path";

const router = Router();
const dbPath = resolve(__dirname, "../../db/ny_cab_data.db");
var sqlite3 = require("sqlite3").verbose();

router.get("/:medallion", (req, res) => {
  const { medallion } = req.params;
  const { date, noCache = false } = req.query;

  var db = new sqlite3.Database(dbPath, err => {
    if (err) console.log("Could not connect to databse", err);
  });

  db.all(
    `SELECT pickup_datetime FROM cab_trip_data WHERE medallion='${medallion}'`,
    (err, rows) => {
      if (err) {
        console.log(err);
      } else {
        let trips = 0;
        rows.forEach(row => {
          if (row.pickup_datetime.includes(date)) trips++;
        });
        res.send({ medallion, trips });
      }
    }
  );

  db.close(err => {
    if (err) console.error(err.message);
  });
});

router.get("/", (req, res) => {
  const { medallion } = req.query;
  const medallionList = [].concat(medallion);
  let dbPromises = [];

  var db = new sqlite3.Database(dbPath, err => {
    if (err) console.log("Could not connect to databse", err);
  });

  medallionList.forEach(medal => {
    dbPromises.push(
      new Promise((resolve, reject) => {
        db.get(
          `SELECT COUNT(*) AS count from cab_trip_data WHERE medallion='${medal}'`,
          (err, row) => {
            if (err) {
              console.log(err);
              reject(err);
            } else {
              resolve({ medallion: medal, trips: row.count });
            }
          }
        );
      })
    );
  });

  Promise.all(dbPromises).then(values => {
    res.send(values);
  });

  db.close(err => {
    if (err) console.error(err.message);
  });
});

export default router;
