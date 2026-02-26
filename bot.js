const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// ==================== Configuration ====================
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.FRONTEND_URL || 'https://paycoinads-telegram-app.vercel.app';
const CHANNEL_URL = 'https://t.me/PayCoinADS';
const ADMIN_ID = parseInt(process.env.ADMIN_ID); // Admin ID ကို environment variable ကနေ ယူ

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is missing! Please set it in environment variables.');
    process.exit(1);
}

if (!ADMIN_ID) {
    console.error('❌ ADMIN_ID is missing! Please set it in environment variables.');
    process.exit(1);
}

// ==================== Bot Setup (Polling: true for Render) ====================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ==================== Bot Commands ====================

// /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = 
        `မင်္ဂလာပါ PayCoinADS မှ ကြိုဆိုပါတယ်။ 🎉\n\n` +
        `ဂိမ်းဆော့ပြီး ဒင်္ဂါးများရှာဖွေရန် အောက်က Play Game ခလုတ်ကို နှိပ်ပါ။`;

    bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🎮 Play Game', web_app: { url: WEB_APP_URL } },
                    { text: '📢 Join Channel', url: CHANNEL_URL }
                ]
            ]
        }
    }).catch(err => console.error('Failed to send /start message:', err));
});

// /admin command – Admin panel access
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Check if user is admin
    if (userId === ADMIN_ID) {
        bot.sendMessage(chatId, '👑 Admin Panel သို့ ဝင်ရန် အောက်က ခလုတ်ကို နှိပ်ပါ။', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '👑 Admin Panel', web_app: { url: WEB_APP_URL } }]
                ]
            }
        }).catch(err => console.error('Failed to send admin panel message:', err));
    } else {
        bot.sendMessage(chatId, '⛔ You are not Admin.').catch(err => console.error('Failed to send not admin message:', err));
    }
});

// ==================== Express Server (to keep Render happy) ====================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🤖 PayCoinADS Bot is running!');
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`✅ Express server is running on port ${PORT}`);
    console.log('🤖 Bot is polling for updates...');
    console.log(`🎮 Web App URL: ${WEB_APP_URL}`);
    console.log(`📢 Channel URL: ${CHANNEL_URL}`);
    console.log(`👑 Admin ID: ${ADMIN_ID}`);
});

// Graceful shutdown
process.once('SIGINT', () => {
    console.log('🛑 Stopping bot...');
    bot.stopPolling();
    process.exit(0);
});
process.once('SIGTERM', () => {
    console.log('🛑 Stopping bot...');
    bot.stopPolling();
    process.exit(0);
});
