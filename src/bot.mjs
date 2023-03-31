import TeleBot from "telebot";

const {
	DEFAULT_STICKER_ID, TELEGRAM_BOT_TOKEN, DEFAULT_STICKER_EMOJI,
} = process.env;

export class RepaintingBot extends TeleBot {

	constructor(...args) {
		super(...args);
		this.on("text", this.text.bind(this));
		this.on("callbackQuery", this.callback.bind(this));
		this.mod("message", this.message.bind(this));
	}

	static getSetName = (name = "", username = "") => `${name.replaceAll(" ", "_")}_by_${username}`;

	message(data) {
		if (data?.message?.text?.startsWith("/")) {
			const [name, ...words] = data.message.text.split(" ");
			Object.assign(data.message, {
				command: name.replace("/", ""), text: words.join(" "), isCommand: true
			});
		}
		return data;
	}

	async text({command, text: title = "Untitled", from: {id: user_id} = {}, reply = {}} = {}) {
		if (command) return reply.text("Please send name for new set", {asReply: true});
		const setName = this.constructor.getSetName(title, this.username);
		const message = `Create t.me/addemoji/${setName} ?`;
		const replyMarkup = this.inlineKeyboard([[this.inlineButton("Create", {callback: "create"})]]);
		return reply.text(message, {asReply: true, replyMarkup});
	}

	async callback({id, message, data} = {}) {
		if (data !== "create") return;
		const {
			message_id: messageId, chat: {id: chatId} = {}, reply_to_message: {text: title, from: {id: user_id} = {}},
		} = message;
		const options = {
			title, user_id, needs_repainting: true, stickers: [{
				sticker: DEFAULT_STICKER_ID, emoji_list: [DEFAULT_STICKER_EMOJI]
			}]
		};
		const result = await this.createNewStickerSet(options).catch(e => e);
		const setName = this.constructor.getSetName(title, this.username);
		const text = result === true ? `Created set: t.me/addemoji/${setName}` : JSON.stringify(result);
		await this.editMessageText({chatId, messageId}, text);
		const tip = `Now you can add repainting emoji to this set via @stickers bot`;
		if (result === true) return this.sendMessage(chatId, tip);
	}

	async init() {
		const {username} = await this.getMe();
		this.username = username;
	}

	async createNewStickerSet(data = {user_id: 0, title: "", stickers: []}) {
		const {
			name,
			title,
			user_id,
			stickers = [],
			username = this.username,
			needs_repainting = false,
			sticker_format = "animated",
			sticker_type = "custom_emoji",
		} = data || {};
		const form = {
			title,
			user_id,
			sticker_type,
			sticker_format,
			needs_repainting,
			stickers: JSON.stringify(stickers),
			name: this.constructor.getSetName(name || title, username),
		};
		const {result} = await this.request("/createNewStickerSet", form);
		return result;
	}
}

export default new RepaintingBot(TELEGRAM_BOT_TOKEN);
