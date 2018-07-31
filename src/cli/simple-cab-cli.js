var inquirer = require("inquirer");
const axios = require("axios");

const instance = axios.create({
  baseURL: "http://localhost:8000/api/medallions"
});

const start = [
  {
    type: "list",
    name: "start",
    message: "What would you like to do today?",
    choices: ["Get medallion trips", "Clear cache"]
  }
];

const questions = [
  {
    type: "input",
    name: "medallion",
    message: "Enter medallion",
    validate: function(value) {
      return value ? true : "Please enter a medallion";
    }
  },
  {
    type: "confirm",
    name: "cache",
    message: "Use cache?",
    default: true
  },
  {
    type: "confirm",
    name: "filterDate",
    message: "Filter by date?",
    default: false
  },
  {
    type: "input",
    name: "date",
    message: "Enter date (YYYY-MM-DD):",
    validate: function(value) {
      return value ? true : "Please enter a date";
    },
    when: function(answers) {
      return answers.filterDate;
    }
  }
];

function main() {
  console.log("Welcome to the simple cab cli!!");
  inquirer.prompt(start).then(answers => {
    if (answers.start == "Get medallion trips") {
      inquirer.prompt(questions).then(answers => {
        if (answers.filterDate) {
          const url = `/${answers.medallion}?date=${
            answers.date
          }&ignoreCache=${!answers.cache}`;
          instance
            .get(url)
            .then(response => {
              console.log(response.data);
            })
            .catch(error => {
              console.log(error);
            });
        } else {
          const url = `?medallion=${
            answers.medallion
          }&ignoreCache=${!answers.cache}`;
          instance
            .get(url)
            .then(response => {
              const data = response.data;
              data.forEach(medallion => {
                console.log(medallion);
              });
            })
            .catch(error => {
              console.log(error);
            });
        }
      });
    } else {
      instance
        .get("/clearCache")
        .then(response => {
          console.log("Cache cleared!");
        })
        .catch(error => {
          console.log(error);
        });
    }
  });
}

main();
