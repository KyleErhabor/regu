const { Util, Command, Constants } = require("../../index.js");
const { inspect } = require("util");

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            usage: "<query>",
            description: "Run SQL code.",
            requiredArgs: 1,
            protected: true,
            validatePermissions: (message) => Constants.BOT_DEVELOPERS.includes(message.author.id),
            flags: [{
                name: "depth",
                value: "number",
                description: "Sets the depth limit for the object. As the limit increases, " +
                "the result size becomes larger. Avoid specifying a limit if you know it'll " +
                "exceed the 2000 character limit."
            }]
        });
    }
  
    async run(message, args) {
        try {
            let data = await this.client.db.all(args.join(" "));
            let flags = Util.messageFlags(message.content);
            let format = inspect(data, { depth: parseInt(flags.depth, 10) || 0 });
          
            return message.channel.createMessage(`\`\`\`js\n${format}\`\`\``);
        } catch (ex) {
            return message.channel.createMessage(`\`\`\`js\n${ex}\`\`\``);
        }
    }
};