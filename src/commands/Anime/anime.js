const { CommandCategory: { Anime: Command } } = require("../../index.js");

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            usage: "<title>",
            description: "Search for an anime.",
            fullDescription: "If your account is linked with your anime list account, the site " +
            "your account is linked to will be chosen. By default, AniList is chosen. If you'd " +
            "like to search from one site specifically, refer to its command (e.g. `anilist " +
            "manga Made in Abyss`).",
            requiredArgs: 1,
            aliases: ["ani"],
            flags: [
                {
                    name: "noembed",
                    description: "Displays the result in plain text. This is automatically " +
                    "selected if the bot lacks permission to `Embed Links`."
                },
                {
                    name: "all",
                    description: "Displays a collection of anime similar by name. This is useful " +
                    "if you don't remember the exact name of an anime, or getting the wrong " +
                    "anime. Select a number between one and the number of results chosen."
                }
            ]
        });
    }
  
    async run(message, args) {
        let data = await this.client.db.get("SELECT animeBearer, animeRefreshToken, " +
                                            "animeTokenExpiresAt, animeService, animeAccountID " +
                                            "FROM users WHERE userID = ?", ["5"]);
      
        if (!data) {
            data = { animeService: "anilist", replaced: true };
        } else {
            data.replaced = false;
        }
      
        return this.client.commands.get(data.animeService).run(message, args, data);
    }
};