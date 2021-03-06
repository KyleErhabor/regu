const { Util, Command, Constants, CommandError } = require("../../index.js");

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            usage: "<member> <command> (...args)",
            description: "Runs a comand as someone else.",
            fullDescription: "As a safety measure, you cannot pass this command as the command " +
            "argument to prevent infinite loops. The command runs as if you never ran it, making " +
            "it super helpful when testing features.",
            requiredArgs: 2,
            guildOnly: true,
            protected: true,
            validatePermissions: (message) => Constants.BOT_DEVELOPERS.includes(message.author.id)
        });
    }
  
    async run(message, [argMember, argCommand, ...args]) {
        let member = this.findMember(message, [argMember], { strict: true, singleArg: true });
            
        if (member) {
            let command = this.client.commands.get(argCommand);
          
            if (command) {
                if (command.name === this.name) {
                    return message.channel.createMessage(`${Constants.Emojis
                        .LOCK} You cannot sudo a user to run the \`${this.name}\` command.`);
                }
              
                let msg = Object.assign(Object.create(Object.getPrototypeOf(message)), message);
                msg.member = member;
                msg.author = member.user;
                msg.content = `${Util.messagePrefix(message.content) + command
                    .name} ${args.join(" ")}`.trim();
              
                return this.client.emit("messageCreate", msg);
            }
          
            return CommandError.ERR_NOT_FOUND(message, "command", argCommand);
        }
      
        return CommandError.ERR_NOT_FOUND(message, "guild member", argMember);
    }
};