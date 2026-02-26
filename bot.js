const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');

// ==================== Configuration ====================
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = 'https://paycoinads-telegram-app.vercel.app'; 
const ADMIN_PANEL_URL = 'https://paycoinads-telegram-app.vercel.app/admin.html?v=1.1'; 
const CHANNEL_URL = 'https://t.me/PayCoinADS';
const ADMIN_ID = parseInt(process.env.ADMIN_ID); 
const API_BASE_URL = process.env.API_BASE_URL || 'https://paycoinads-telegram-app.vercel.app';

if (!BOT_TOKEN || !ADMIN_ID) {
    console.error('❌ Missing Environment Variables!');
    process.exit(1);
}

// ==================== Bot Setup ====================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ==================== Helper: Fetch Config from Vercel API ====================
async function getConfig(key) {
    try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/settings`, {
            headers: { 'X-Telegram-Init-Data': 'bot' }
        });
        return res.data[key];
    } catch (err) {
        console.error('Failed to fetch config:', err.message);
        return null;
    }
}

// ==================== /start Command with Maintenance Check ====================
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const maintenance = await getConfig('MAINTENANCE_MODE');
        if (maintenance) {
            const maintMsg = await getConfig('MAINTENANCE_MESSAGE') || 'Site is under maintenance. Please check back later.';
            return bot.sendMessage(chatId, `🔧 ${maintMsg}`);
        }
    } catch (err) {
        console.error('Maintenance check error:', err);
    }

    bot.sendMessage(chatId, `မင်္ဂလာပါ PayCoinADS မှ ကြိုဆိုပါတယ်။ 🎉\n\nဂိမ်းဆော့ပြီးပိုက်ဆံရှာရန် အောက်က ခလုတ်ကို နှိပ်ပါ။`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🎮 Play Game', web_app: { url: WEB_APP_URL } }],
                [{ text: '📢 Join Channel', url: CHANNEL_URL }]
            ]
        }
    }).catch(err => console.error('Start message error:', err));
});

// ==================== /admin Command ====================
bot.onText(/\/admin/, (msg) => {
    if (msg.from.id === ADMIN_ID) {
        bot.sendMessage(msg.chat.id, '👑 Admin Panel သို့ ဝင်ရန် အောက်က ခလုတ်ကို နှိပ်ပါ။', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '👑 Open Admin Panel', web_app: { url: ADMIN_PANEL_URL } }]
                ]
            }
        }).catch(err => console.error('Admin message error:', err));
    } else {
        bot.sendMessage(msg.chat.id, '⛔ You are not Authorized.').catch(err => console.error('Not admin message error:', err));
    }
});

// ==================== Express Server Setup ====================
const app = express();
app.use(express.json());

// ==================== Broadcast System ====================
app.post('/broadcast', async (req, res) => {
    const { message, adminId } = req.body;
    
    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    res.status(202).json({ status: 'started' });

    try {
        const usersRes = await axios.get(`${API_BASE_URL}/api/admin/users`, {
            headers: { 'X-Telegram-Init-Data': 'bot' }
        });
        const users = usersRes.data.users || [];
        
        const BATCH_SIZE = 50;
        const DELAY_MS = 3000;
        
        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const batch = users.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (user) => {
                try {
                    await bot.sendMessage(user.userId, message, { parse_mode: 'HTML' });
                } catch (err) {
                    console.error(`Failed to send to user ${user.userId}:`, err.message);
                }
            }));
            
            if (i + BATCH_SIZE < users.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }
        
        console.log(`Broadcast completed to ${users.length} users`);
    } catch (err) {
        console.error('Broadcast error:', err);
    }
});

// ==================== Withdrawal Notification ====================
app.post('/withdrawal-notify', async (req, res) => {
    const { userId, amount, status, reason, adminId } = req.body;
    
    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        let message;
        if (status === 'completed') {
            message = `✅ သင်၏ ငွေထုတ်တောင်းဆိုမှု အတည်ပြုပြီးပါပြီ။\nပမာဏ: ${amount} ဒင်္ဂါး\nကျေးဇူးတင်ပါသည်။`;
        } else if (status === 'rejected') {
            message = `❌ သင်၏ ငွေထုတ်တောင်းဆိုမှု ငြင်းပယ်ခံရပါသည်။\nအကြောင်းရင်း: ${reason}\nငွေပမာဏ ${amount} ဒင်္ဂါးကို သင့်အကောင့်သို့ ပြန်လည်ထည့်သွင်းပေးထားပါသည်။`;
        } else {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await bot.sendMessage(userId, message, { parse_mode: 'HTML' });
        res.json({ success: true });
    } catch (err) {
        console.error('Withdrawal notification error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== Health Check ====================
app.get('/', (req, res) => res.send('🤖 PayCoinADS Bot is Running!'));
app.get('/health', (req, res) => res.send('OK'));

// ==================== Start Server ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Bot server running on port ${PORT}`);
    console.log(`👑 Admin ID: ${ADMIN_ID}`);
    console.log(`📢 Channel: ${CHANNEL_URL}`);
});
