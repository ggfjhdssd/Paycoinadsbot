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
            headers: { 'X-Telegram-Init-Data': 'bot' },
            timeout: 5000
        });
        return res.data[key];
    } catch (err) {
        console.error('❌ Failed to fetch config:', err.message);
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
        console.error('❌ Maintenance check error:', err);
    }

    bot.sendMessage(chatId, `မင်္ဂလာပါ PayCoinADS မှ ကြိုဆိုပါတယ်။ 🎉\n\nဂိမ်းဆော့ပြီးပိုက်ဆံရှာရန် အောက်က ခလုတ်ကို နှိပ်ပါ။`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🎮 Play Game', web_app: { url: WEB_APP_URL } }],
                [{ text: '📢 Join Channel', url: CHANNEL_URL }]
            ]
        }
    }).catch(err => console.error('❌ Start message error:', err));
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
        }).catch(err => console.error('❌ Admin message error:', err));
    } else {
        bot.sendMessage(msg.chat.id, '⛔ You are not Authorized.').catch(err => console.error('❌ Not admin message error:', err));
    }
});

// ==================== Express Server Setup ====================
const app = express();
app.use(express.json());

// ==================== Health Check ====================
app.get('/', (req, res) => res.send('🤖 PayCoinADS Bot is Running!'));
app.get('/health', (req, res) => res.send('OK'));

// ==================== Broadcast System (Improved) ====================
app.post('/broadcast', async (req, res) => {
    const { message, adminId } = req.body;
    
    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Immediate response to admin
    res.status(202).json({ status: 'started', message: 'Broadcast started in background' });

    // Process broadcast in background
    (async () => {
        console.log('📢 Broadcast started...');
        let successCount = 0;
        let failCount = 0;
        const failedUsers = [];

        try {
            // Fetch users with timeout
            const usersRes = await axios.get(`${API_BASE_URL}/api/admin/users`, {
                headers: { 'X-Telegram-Init-Data': 'bot' },
                timeout: 10000
            });
            const users = usersRes.data.users || [];
            
            console.log(`👥 Total users to broadcast: ${users.length}`);
            
            // Optimized batch settings
            const BATCH_SIZE = 20;        // Smaller batch size to avoid rate limits
            const BATCH_DELAY = 3000;      // 3 seconds between batches
            const USER_DELAY = 150;         // 150ms between each user in batch
            
            for (let i = 0; i < users.length; i += BATCH_SIZE) {
                const batch = users.slice(i, i + BATCH_SIZE);
                console.log(`📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(users.length/BATCH_SIZE)} (${batch.length} users)`);
                
                // Send messages sequentially to avoid flooding
                for (const user of batch) {
                    try {
                        await bot.sendMessage(user.userId, message, { 
                            parse_mode: 'HTML',
                            disable_web_page_preview: true
                        });
                        successCount++;
                        console.log(`✅ Sent to ${user.userId}`);
                        
                        // Small delay between each user
                        await new Promise(resolve => setTimeout(resolve, USER_DELAY));
                        
                    } catch (err) {
                        console.error(`❌ Failed to send to ${user.userId}:`, err.message);
                        failCount++;
                        failedUsers.push(user.userId);
                        
                        // Handle flood wait errors
                        if (err.message.includes('429') || err.message.includes('flood')) {
                            console.log('⏳ Flood limit detected, waiting 10 seconds...');
                            await new Promise(resolve => setTimeout(resolve, 10000));
                        }
                    }
                }
                
                // Delay between batches (except last batch)
                if (i + BATCH_SIZE < users.length) {
                    console.log(`⏳ Waiting ${BATCH_DELAY/1000} seconds before next batch...`);
                    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
                }
            }
            
            // Log final results
            console.log(`
╔══════════════════════════════════╗
║     📊 Broadcast Results         ║
╠══════════════════════════════════╣
║ ✅ Successful: ${successCount.toString().padEnd(8)}           ║
║ ❌ Failed: ${failCount.toString().padEnd(10)}           ║
║ 👥 Total: ${users.length.toString().padEnd(10)}           ║
╚══════════════════════════════════╝
            `);
            
            if (failedUsers.length > 0) {
                console.log('❌ Failed users:', failedUsers.join(', '));
            }
            
        } catch (err) {
            console.error('❌ Broadcast system error:', err.message);
            if (err.code === 'ECONNABORTED') {
                console.error('⏰ Timeout error - API connection too slow');
            }
        }
    })(); // Immediately invoked async function
});

// ==================== Withdrawal Notification ====================
app.post('/withdrawal-notify', async (req, res) => {
    const { userId, amount, status, reason, adminId } = req.body;
    
    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!userId || !amount || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        let message;
        if (status === 'completed') {
            message = `✅ သင်၏ ငွေထုတ်တောင်းဆိုမှု အတည်ပြုပြီးပါပြီ။\n\n` +
                     `💰 ပမာဏ: ${amount} ဒင်္ဂါး\n` +
                     `✨ ကျေးဇူးတင်ပါသည်။`;
        } else if (status === 'rejected') {
            message = `❌ သင်၏ ငွေထုတ်တောင်းဆိုမှု ငြင်းပယ်ခံရပါသည်။\n\n` +
                     `💰 ပမာဏ: ${amount} ဒင်္ဂါး\n` +
                     `📝 အကြောင်းရင်း: ${reason || 'အကြောင်းပြချက် မရှိပါ'}\n\n` +
                     `💫 ငွေပမာဏကို သင့်အကောင့်သို့ ပြန်လည်ထည့်သွင်းပေးထားပါသည်။`;
        } else {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await bot.sendMessage(userId, message, { 
            parse_mode: 'HTML',
            disable_web_page_preview: true 
        });
        
        console.log(`✅ Withdrawal notification sent to user ${userId} (${status})`);
        res.json({ success: true });
        
    } catch (err) {
        console.error('❌ Withdrawal notification error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ==================== Error Handler for Express ====================
app.use((err, req, res, next) => {
    console.error('❌ Express error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// ==================== Start Server ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════╗
║   🤖 PayCoinADS Bot is Ready!    ║
╠══════════════════════════════════╣
║ 📡 Port: ${PORT.toString().padEnd(27)} ║
║ 👑 Admin ID: ${ADMIN_ID.toString().padEnd(22)} ║
║ 📢 Channel: PayCoinADS            ║
║ 🌐 API: ${API_BASE_URL.replace('https://', '').padEnd(21)} ║
╚══════════════════════════════════╝
    `);
});

// Graceful shutdown
process.once('SIGINT', () => {
    console.log('\n🛑 Stopping bot...');
    bot.stopPolling();
    process.exit(0);
});
process.once('SIGTERM', () => {
    console.log('\n🛑 Stopping bot...');
    bot.stopPolling();
    process.exit(0);
});
