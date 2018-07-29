import { Router } from "express";
import { resolve } from "path";
import NodeCache from "node-cache";

const router = Router();
const dbPath = resolve(__dirname, "../../db/ny_cab_data.db");
var sqlite3 = require("sqlite3").verbose();
const resCache = new NodeCache();

const getMedallionTripsByDate = (medallion, date) =>
  new Promise((resolve, reject) => {
    // open database connection
    var db = new sqlite3.Database(dbPath, err => {
      if (err) console.log("Could not connect to databse: ", err);
    });

    // query database
    db.all(
      `SELECT pickup_datetime FROM cab_trip_data WHERE medallion='${medallion}'`,
      (err, rows) => {
        if (err) {
          console.log("Databse Query Error: ", err);
        } else {
          let trips = 0;

          rows.forEach(row => {
            if (row.pickup_datetime.includes(date)) trips++;
          });

          const result = { medallion, date, trips };

          //caching every result as per requirements
          resCache.set(`${medallion}-${date}`, result, (err, success) => {
            if (err) console.log("CACHE ERROR: ", err);
          });
          resolve(result);
        }
      }
    );

    db.close(err => {
      if (err) console.error(err.message);
    });
  });

const getTotalMedallionTrips = medallionList =>
  new Promise((resolve, reject) => {
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

    Promise.all(dbPromises)
      .then(values => {
        values.forEach(value => {
          resCache.set(value.medallion, value, (err, success) => {
            if (err) console.log("CACHE ERROR: ", err);
          });
        });
        resolve(values);
      })
      .catch(err => {
        console.log("Promise failed: ", err);
      });

    db.close(err => {
      if (err) console.error(err.message);
    });
  });

router.get("/clearCache", (req, res) => {
  resCache.keys((err, resKeys) => {
    if (err) {
      console.log("error: ", err);
    } else {
      console.log("clearing keys");
      console.log(resKeys);
    }
  });

  resCache.flushAll();
  res.sendStatus(204);
});

router.get("/:medallion", (req, res) => {
  const { medallion } = req.params;
  const { date, ignoreCache = "false" } = req.query;

  if (ignoreCache === "true") {
    getMedallionTripsByDate(medallion, date).then(result => res.send(result)); //should put a catch on this
  } else {
    resCache.get(`${medallion}-${date}`, (err, value) => {
      if (err) {
        console.log("error: ", err);
      } else {
        if (value != undefined) {
          res.send(value);
        } else {
          console.log("Key not found querying the db");
          getMedallionTripsByDate(medallion, date).then(result =>
            res.send(result)
          ); //should put a catch on this
        }
      }
    });
  }
});

router.get("/", (req, res) => {
  const { medallion, ignoreCache = "false" } = req.query;
  const medallionList = [].concat(medallion);

  if (ignoreCache === "true") {
    getTotalMedallionTrips(medallionList).then(result => {
      res.send(result);
    });
  } else {
    //use cache
    const medallionPromises = [];
    let resultList = [];
    medallionList.forEach(medal => {
      medallionPromises.push(
        new Promise((resolve, reject) => {
          resCache.get(medal, (err, value) => {
            if (err) {
              console.log("error: ", err);
            } else {
              if (value != undefined) {
                resolve(value);
              } else {
                resolve(
                  getTotalMedallionTrips([medal]).then(result => result.pop())
                );
              }
            }
          });
        })
      );
    });

    Promise.all(medallionPromises)
      .then(values => {
        res.send(values);
      })
      .catch(err => {
        console.log("Promise failed: ", err);
      });
  }
});

export default router;
