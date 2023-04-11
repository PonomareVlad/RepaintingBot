import TeleBot from "telebot";
import {readFileSync} from "fs";
import "telebot/plugins/shortReply.js";
import "telebot/plugins/regExpMessage.js";
import {parseCommands, NewMethodsMixin, getSetName} from "telebot-utils";

const {
    LOG_CHAT_ID,
    TELEGRAM_BOT_TOKEN,
    DEFAULT_STICKER_EMOJI,
} = process.env;

export class RepaintingBot extends NewMethodsMixin(TeleBot) {

    constructor(...args) {
        super(...args);
        this.mod("message", parseCommands);
        this.on("text", this.text.bind(this));
        this.on("callbackQuery", this.callback.bind(this));
    }

    async text({command, message_id, text: title = "Untitled", chat: {id}, from: {id: user_id} = {}, reply = {}} = {}) {
        if (command) return reply.text("Please send name for new set", {asReply: true});
        if (LOG_CHAT_ID) await this.forwardMessage(parseInt(LOG_CHAT_ID), id, message_id);
        const setName = getSetName(title, this.username);
        const {name} = await this.getStickerSet({title}).catch(e => e);
        if (name) return await reply.text(`Set already exist: t.me/addemoji/${setName}`, {asReply: true});
        const message = `Create t.me/addemoji/${setName} ?`;
        const replyMarkup = this.inlineKeyboard([[this.inlineButton("Create", {callback: "create"})]]);
        return reply.text(message, {asReply: true, replyMarkup});
    }

    async callback({id, message, data} = {}) {
        if (data !== "create") return;
        const {
            message_id: messageId, chat: {id: chatId} = {}, reply_to_message: {text: title, from: {id: user_id} = {}},
        } = message;
        const options = {title, user_id, needs_repainting: true};
        const buffer = readFileSync(new URL("../public/sticker.tgs", import.meta.url));
        const {file_id} = await this.uploadStickerFile({...options, buffer});
        const sticker = {sticker: file_id, emoji_list: [DEFAULT_STICKER_EMOJI]};
        const result = await this.createNewStickerSet({...options, stickers: [sticker]}).catch(e => e);
        if (result === true) {
            const {stickers = []} = await this.getStickerSet(options).catch(e => e);
            const setStickers = stickers.map(({file_id} = {}) => file_id);
            if (setStickers.length === 1) await this.deleteStickerFromSet({sticker: setStickers.at(0)}).catch(e => e);
            const setName = getSetName(title, this.username);
            const text = `Created set: t.me/addemoji/${setName}`;
            await this.editMessageText({chatId, messageId}, text);
            if (LOG_CHAT_ID) await this.sendMessage(parseInt(LOG_CHAT_ID), text);
            const tip = `Now you can add emoji to this set via @stickers bot`;
            return this.sendMessage(chatId, tip);
        } else {
            return await this.editMessageText({chatId, messageId}, JSON.stringify(result));
        }
    }

}

export default new RepaintingBot(TELEGRAM_BOT_TOKEN);
