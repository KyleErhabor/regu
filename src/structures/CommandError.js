class CommandError {
    static ERR_NOT_FOUND(message, type, search) {
        return message.channel.createMessage(`No ${type} named "${search}" found.`);
    }
}

module.exports = CommandError;