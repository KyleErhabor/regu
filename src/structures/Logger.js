"use strict";

const dateformat = require("dateformat");
const { inspect } = require("util");
const chalk = require("chalk");

module.exports = class {
    constructor(time) {
        this.timestamp = time;
    }
  
    get time() {
        return `[${dateformat(this.timestamp || Date.now(), "mediumTime")}]`;
    }
  
    log(...args) {
        console.log(`${this.time} ${this.constructor.clean(args)}`);
    }
  
    info(...args) {
        console.info(chalk.cyan(`${this.time} ${this.constructor.clean(args)}`));
    }
  
    debug(...args) {
        console.debug(chalk.green(`${this.time} ${this.constructor.clean(args)}`));
    }
  
    warn(...args) {
        console.warn(chalk.yellow(`${this.time} ${chalk
            .bgYellow("[WARN]")} ${this.constructor.clean(args)}`));
    }
  
    error(...args) {
        console.error(chalk.redBright(`${this.time} ${chalk
            .bgRedBright("ERR!")} ${this.constructor.clean(args)}`));
    }
  
    static clean(args) {
        return args.map((argument) => {
            if (argument instanceof Error) {
                return argument.stack;
            } else if (typeof argument !== "string") {
                return inspect(argument);
            }
          
            return argument;
        }).join(" ");
    }
};