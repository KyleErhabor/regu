const { Command } = require("../../index.js");

module.exports = class extends Command {
    constructor(...args) {
        super(...args, { description: "Pong!" });
    }
  
    async run(message) {
        return message.channel.createMessage("Pinging...").then((msg) => {
            let time = msg.timestamp - message.timestamp;
          
            return msg.edit(`Pong! (Took: ${time}ms)`);
        });
    }
};