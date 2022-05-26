const { Util, Command, Constants } = require("../../index.js");
const ANILIST_URL = "https://anilist.co/";
const KITSU_URL = "https://kitsu.io/";
const fetch = require("node-fetch");

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            description: "Authorizes the bot to use and link your anime list account.",
            fullDescription: "Note: The bot will **never** perform actions on your account " +
            "without your consent.\n\n" +
            "The login command allows you to authorize the bot to use your anime listing " +
            "site account for other commands that require you be logged in and personalize " +
            "what content you may see. For example, the anime command will use Kitsu " +
            `(<${KITSU_URL}>) as the default provider instead of AniList (<${ANILIST_URL}>).\n\n` +
            "You should not link your account if you do not trust the bot and rely on the normal " +
            "commands instead. If you do, please DM the bot to start the linking process.\n" + [
                "Select a list provider (AniList, Kitsu, etc).",
                "Grant the bot permission to access your account through a redirect or entering " +
                "your password. By password, this means your password to the site. We prefer the " +
                "use of redirect URIs, but some sites don't support it (e.g. Kitsu). Your " +
                "password will **NEVER** be shared and is **NOT** saved."
            ].map((str, index) => `- \`${index + 1}.\` ${str}`).join("\n"),
            cooldown: 10,
            aliases: ["auth"],
            validatePermissions: (message) => {
                let statement = "SELECT EXISTS (SELECT 1 FROM users WHERE userID = ?)";
              
                return this.client.db.get(statement, [
                    message.author.id
                ]).then((data) => {
                    return data[statement.replace("SELECT ", "")] === 1
                        ? "You are already logged into your account. If you wish to log out, use " +
                        "the `logout` command."
                        : true;
                });
            }
        });
    }
  
    async run(message) {
        let channel = message.channel.guild
            ? await message.author.getDMChannel().catch(() => {})
            : message.channel;
      
        if (channel) {
            let sites = [
                {
                    title: "AniList",
                    siteUrl: ANILIST_URL
                }
            ];
          
            let firstContent = "**Login**\n1) Please select the site you would like to use\n" +
            sites.map((site, index) => `- \`${index + 1}.\` ${site.title} (<${site.siteUrl}>)`)
                .join("\n");
                    
            try {
                let siteMsg = await Util.messagePrompt(message, channel, firstContent, 60000, [
                    ...sites.map((site, index) => index + 1),
                    ...sites.map((site) => site.title.toLowerCase())
                ]);
              
                let siteData = sites.find((site, index) => {
                    return parseInt(siteMsg.content, 10) === index + 1 ||
                    siteMsg.content.toLowerCase() === site.title.toLowerCase();
                });
                            
                switch (siteData.title) {
                    case "AniList": {
                        let oAuthURL = "https://anilist.co/api/v2/oauth/authorize" +
                        "?client_id=2923&response_type=code";
                        let content = `**Authorization**\n2) Please authorize __${this.client.user
                            .username} Bot__ to access your account through the following URL: ` +
                            `<${oAuthURL}>\n\nOnce accepted, paste the code in the text field in ` +
                            "this channel. If denied, type `cancel`.";
                      
                        // 5 minutes.
                        let codeGrant = await Util.messagePrompt(message, channel, content, 300000);
                                            
                        if (codeGrant === "undefined" || codeGrant === "cancel") {
                            return channel.createMessage("Aborted.");
                        }
                      
                        let username = await this._setAniListData(message, channel, codeGrant
                            .content);
                      
                        return channel.createMessage(`${Constants.Emojis
                            .LINK} Successfully linked account to **${username}**.`);
                    }
                    
                    default: {
                        throw new Error(`Unknwon site title: ${siteData.title}`);
                    }
                }
            } catch (ex) {
                if (Array.isArray(ex)) {
                    return channel.createMessage("Aborted.");
                } else if (ex.message === "Failed.") {
                    return;
                }
              
                throw ex;
            }
        }
      
        return message.channel.createMessage(`${Constants.Emojis
            .LOCK} Your DMs are private/locked. Please enable receiving messages then run this ` +
                                             "command again.");
    }
  
    async _setAniListData(message, channel, codeGrant) {
        let bearerData = await fetch("https://anilist.co/api/v2/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                code: codeGrant,
                grant_type: "authorization_code",
                client_id: Constants.ANILIST_CLIENT_ID,
                client_secret: Constants.ANILIST_CLIENT_SECRET,
                redirect_uri: "https://anilist.co/api/v2/oauth/pin"
            })
        }).then(this.checkStatus);
      
        if (bearerData.error) {
            if (bearerData.error === "invalid_request") {
                channel.createMessage("Invalid authorization code.");
            }

            let err = new Error("Failed.");
            err.code = "invalid_request";

            throw err;
        }

        this.client.animeAccessTokens.set(message.author.id, {
            expiresIn: bearerData.expires_in,
            accessToken: bearerData.access_token,
            refreshToken: bearerData.refresh_token
        });
      
        let query = `query UserData { Viewer { id name } }`;
        let variables = {};
        let user = await fetch("https://graphql.anilist.co/", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${bearerData.access_token}`,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({ query, variables })
        }).then((res) => res.json()).then((data) => data.data.Viewer);
      
        await this.client.db.run("INSERT INTO users (userID, animeBearer, animeRefreshToken, " +
                                 "animeService, animeAccountID) VALUES " +
                                 "(?, ?, ?, ?, ?)", [
            message.author.id,
            bearerData.access_token,
            bearerData.refresh_token,
            "anilist",
            user.id
        ]);
      
        return user.name;
    }
};