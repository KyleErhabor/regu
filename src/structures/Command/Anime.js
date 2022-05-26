const Constants = require("../../utils/Constants.js");
const Command = require("./Command.js");
const Turndown = require("turndown");
const fetch = require("node-fetch");

module.exports = class extends Command {
    constructor(...args) {
        super(...args);
      
        this.markdown = new Turndown({
            hr: "- - -",
            fence: "```",
            codeBlockStyle: "fenced"
        });
      
        this.markdown.escape = (str) => str;
    }
  
    parseALMarkdown(text) {
        return this.markdown.turndown(text.replace(/\n/g, ""))
            .replace(/_{3,}/g, "")
            .replace(/~!([^!]+[^~]+)~/g, "<spoiler snip>").replace(/~{3}/g, "")
            // eslint-disable-next-line max-len
            .replace(/(img(\d{1,4}%?)?|webm)\(\bhttps?:\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]\)/gi, "")
            // eslint-disable-next-line max-len
            .replace(/youtube\(https?:\/\/(?:www\.)?(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w_-]{11})\)/g, (txt, match) => `[YouTube](https://youtu.be/${match})`);
    }
  
    async requestAL(query, variables, message, userData) {
        let options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({ query, variables })
        };
      
        if (userData) {
            if (Date.now() < userData.animeTokenExpiresAt + userData.timestamp) {
                let bearerData = await fetch("https://anilist.co/api/v2/oauth/token", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json"
                    },
                    body: JSON.stringify({
                        code: userData.animeRefreshToken,
                        grant_type: "authorization_code",
                        client_id: Constants.ANILIST_CLIENT_ID,
                        client_secret: Constants.ANILIST_CLIENT_SECRET,
                        redirect_uri: "https://anilist.co/api/v2/oauth/pin"
                    })
                }).then(this.checkStatus);
              
                this.client.animeAccessTokens.replace(message.author.id, {
                    expiresIn: bearerData.expires_in,
                    accessToken: bearerData.access_token,
                    refreshToken: bearerData.refresh_token
                });
              
                let res = await this.client.db.get("UPDATE users SET animeBearer = ?, " +
                                         "animeRefreshToken = ? WHERE userID = ?", [
                    bearerData.access_token,
                    bearerData.refresh_token,
                    message.author.id
                ]);
                            
                userData = bearerData;
                // await this.client.db.run("INSERT INTO users (userID, animeBearer, animeRefreshToken, " +
                //                          "animeService, animeAccountID) VALUES " +
                //                          "(?, ?, ?, ?, ?)", [
                //     message.author.id,
                //     bearerData.access_token,
                //     bearerData.refresh_token,
                //     "anilist",
                //     user.id
                // ]);
            }
          
            // options.headers.Authorization = `Bearer ${userData}`;
        }
      
        return fetch("https://graphql.anilist.co/", options).then(this.checkStatus);
    }
};