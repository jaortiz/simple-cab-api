import { Router } from "express";
import { resolve } from "path";
import NodeCache from "node-cache";

const router = Router();
const dbPath = resolve(__dirname, "../../db/ny_cab_data.db");
var sqlite3 = require("sqlite3").verbose();
const resCache = new NodeCache();

/**
 * Queries the database for number of trips a medallion has taken on a specific date. Returns a promise of the results
 *
 * @param {*} medallion - medallion to search
 * @param {*} date      - date to filter search
 * @return Promise - result of the database query
 */
const getMedallionTripsByDate = (medallion, date) =>
  new Promise((resolve, reject) => {
    // open database connection
    var db = new sqlite3.Database(dbPath, err => {
      if (err) {
        console.log("Could not connect to databse: ", err);
        reject(`Could not connect to databse: ${err}`);
      }
    });

    db.serialize(() => {
      db.get(
        `SELECT EXISTS(SELECT 1 FROM cab_trip_data WHERE medallion='${medallion}') AS found`, // check if the medallion exists
        (err, row) => {
          if (err) {
            console.error("DB Query Error: ", err);
            reject(`Query Error: ${err}`);
          }

          if (row.found) {
            db.get(
              `SELECT COUNT(pickup_datetime) AS count FROM cab_trip_data WHERE medallion='${medallion}' AND pickup_datetime LIKE '%${date}%'`,
              (err, row) => {
                if (err) {
                  console.error("DB Query Error: ", err);
                  reject(`DB Query Error: ${err}`);
                } else {
                  const result = { medallion, date, trips: row.count };

                  //caching every result
                  resCache.set(
                    `${medallion}-${date}`,
                    result,
                    (err, success) => {
                      if (err) {
                        console.error("Cache Error: ", err);
                        reject(`Cache Error: ${err}`);
                      } else if (success) {
                        console.log(`Response Cached`);
                        console.log(result);
                      }
                    }
                  );
                  resolve(result);
                }
              }
            ).close();
          } else {
            reject(`Medallion ${medallion} does not exist`);
          }
        }
      );
    });
  });

/**
 * Queries the database for the total number of trips a medallion has taken.
 *
 * @param {*} medallionList - list of medallions
 * @return Promise - result of the database query
 */
const getTotalMedallionTrips = medallionList =>
  new Promise((resolve, reject) => {
    let dbPromises = [];

    var db = new sqlite3.Database(dbPath, err => {
      if (err) {
        console.log("Could not connect to databse: ", err);
        reject(`Could not connect to databse: ${err}`);
      }
    });

    // for each medallion we create a new promise to deal with asynchronous database calls
    medallionList.forEach(medal => {
      dbPromises.push(
        new Promise((resolve, reject) => {
          db.serialize(() => {
            db.get(
              `SELECT EXISTS(SELECT 1 FROM cab_trip_data WHERE medallion='${medal}') AS found`, // check if the medallion exists
              (err, row) => {
                if (err) {
                  console.error("DB Query Error: ", err);
                  reject(`Query Error: ${err}`);
                }

                if (row.found) {
                  db.get(
                    `SELECT COUNT(*) AS count from cab_trip_data WHERE medallion='${medal}'`,
                    (err, row) => {
                      if (err) {
                        console.error("DB Query Error: ", err);
                        reject(`DB Query Error: ${err}`);
                      } else {
                        resolve({ medallion: medal, trips: row.count });
                      }
                    }
                  );
                } else {
                  resolve({ medallion: `Medallion ${medal} does not exist` }); // resolve instead of reject here as we may be dealing with a list of medallions (reject will halt all following queries)
                }
              }
            );
          });
        })
      );
    });

    // resolve all the database query promises, ensures all queries are completed before further processing
    Promise.all(dbPromises)
      .then(values => {
        values.forEach(value => {
          resCache.set(value.medallion, value, (err, success) => {
            if (err) {
              console.error("Cache Error: ", err);
              reject(`Cache Error: ${err}`);
            } else if (success) {
              console.log(`Response Cached`);
              console.log(value);
            }
          });
        });
        db.close();
        resolve(values);
      })
      .catch(err => {
        console.log("Promise failed: ", err);
        reject(`Promise failed: ${err}`);
      });
  });

router.get("/clearCache", (req, res) => {
  resCache.keys((err, resKeys) => {
    if (err) {
      console.log("error: ", err);
      res.status(500).send(`Cache Error: ${err}`);
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
    getMedallionTripsByDate(medallion, date)
      .then(result => res.send(result))
      .catch(reason => res.status(400).send(reason));
  } else {
    resCache.get(`${medallion}-${date}`, (err, value) => {
      if (err) {
        console.log("Cache Error: ", err);
        res.status(500).send(`Cache Error: ${err}`);
      } else {
        if (value != undefined) {
          res.send(value);
        } else {
          getMedallionTripsByDate(medallion, date) // if response is not in cache we have to make a database query
            .then(result => res.send(result))
            .catch(reason => {
              res.status(400).send(reason);
            });
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
    medallionList.forEach(medal => {
      medallionPromises.push(
        // using promises again here since some responses might be cached and others not. If response is not cached we have to make a database call which is asynchronous
        new Promise((resolve, reject) => {
          resCache.get(medal, (err, value) => {
            if (err) {
              console.log("Cache Error: ", err);
              res.status(500).send(`Cache Error: ${err}`);
            } else {
              if (value != undefined) {
                resolve(value);
              } else {
                resolve(
                  getTotalMedallionTrips([medal]).then(result => result.pop()) // if response is not in cache we have to make a database query
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
        res.status(400).send(err);
      });
  }
});

export default router;
