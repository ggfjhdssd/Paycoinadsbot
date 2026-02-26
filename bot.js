const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// ==================== Configuration ====================
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = 'https://paycoinads-telegram-app.vercel.app'; 
// Cache ပြဿနာရှင်းရန် ?v=1.1 ထည့်ထားသည်
const ADMIN_PANEL_URL = 'https://paycoinads-telegram-app.vercel.app/admin.html?v=1.1'; 
const CHANNEL_URL = 'https://t.me/PayCoinADS';
const ADMIN_ID = parseInt(process.env.ADMIN_ID); 

if (!BOT_TOKEN || !ADMIN_ID) {
    console.error('❌ Missing Environment Variables!');
    process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// /start command
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `မင်္ဂလာပါ PayCoinADS မှ ကြိုဆိုပါတယ်။ 🎉\n\nဂိမ်းဆော့ပြီးပိုက်ဆံရှာရန် အောက်က ခလုတ်ကို နှိပ်ပါ။`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🎮 Play Game', web_app: { url: WEB_APP_URL } }],
                [{ text: '📢 Join Channel', url: CHANNEL_URL }]
            ]
        }
    });
});

// /admin command
bot.onText(/\/admin/, (msg) => {
    if (msg.from.id === ADMIN_ID) {
        bot.sendMessage(msg.chat.id, '👑 Admin Panel သို့ ဝင်ရန် အောက်က ခလုတ်ကို နှိပ်ပါ။', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '👑 Open Admin Panel', web_app: { url: ADMIN_PANEL_URL } }]
                ]
            }
        });
    } else {
        bot.sendMessage(msg.chat.id, '⛔ You are not Authorized.');
    }
});

// Express Server for Render
const app = express();
app.get('/', (req, res) => res.send('Bot is Running!'));
app.listen(process.env.PORT || 3000);
