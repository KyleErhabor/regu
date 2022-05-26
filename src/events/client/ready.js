const { Util, Constants, EventListener } = require("../../index.js");

module.exports = class extends EventListener {
    constructor(...args) {
        super(...args, { once: true });
    }
  
    async run() {
        this.client.logger.log(`Authenticated as ${Util.userTag(this.client.user)} (${this.client
            .user.id}) | Serving ${this.client.guilds.size} guilds and ${this.client.guilds
            .reduce((prev, guild) => prev + guild.memberCount, 0)} users.`);
      
        return this.client.editStatus("online", {
            name: `${Constants.PRIMARY_PREFIX}help | Made in Abyss OST`,
            type: 2
        });
    }
};