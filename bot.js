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
const bot = new TelegramBot(BOT_TOKEN, { 
    polling: true,
    onlyFirstMatch: true
});

// Polling error handler (409 Conflict prevention)
bot.on('polling_error', async (error) => {
    console.error('❌ Polling error:', error.message);
    
    if (error.message.includes('409') || error.message.includes('Conflict')) {
        console.log('🔄 409 Conflict detected - attempting recovery...');
        
        try {
            await bot.stopPolling();
            console.log('✅ Polling stopped');
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Clear webhook
            await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
            console.log('✅ Webhook cleared');
            
            await bot.startPolling();
            console.log('✅ Polling restarted successfully');
        } catch (e) {
            console.error('❌ Recovery failed:', e.message);
        }
    }
});

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

// ==================== BROADCAST ENDPOINT ====================
app.post('/broadcast', async (req, res) => {
    const { message, adminId } = req.body;
    
    if (Number(adminId) !== ADMIN_ID) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Immediate response
    res.status(202).json({ success: true, message: 'Broadcast started in background' });

    // Background process
    (async () => {
        console.log('📢 Broadcast started...');
        
        let successCount = 0;
        let failCount = 0;
        const failedUsers = [];

        try {
            console.log('🔄 Fetching users from Vercel...');
            const usersRes = await axios.get(`${API_BASE_URL}/api/admin/users`, {
                headers: { 'X-Telegram-Init-Data': 'bot' },
                timeout: 15000
            });
            
            const users = usersRes.data.users || [];
            console.log(`👥 Total users to broadcast: ${users.length}`);

            if (users.length === 0) {
                console.log('⚠️ No users to broadcast');
                return;
            }

            const BATCH_SIZE = 30; // Reduced to be safer
            const BATCH_DELAY = 3000;
            const USER_DELAY = 100;

            for (let i = 0; i < users.length; i += BATCH_SIZE) {
                const batch = users.slice(i, i + BATCH_SIZE);
                const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                const totalBatches = Math.ceil(users.length / BATCH_SIZE);
                
                console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} users)`);

                for (const user of batch) {
                    try {
                        await bot.sendMessage(user.userId, message, { 
                            parse_mode: 'HTML',
                            disable_web_page_preview: true
                        });
                        successCount++;
                        
                        await new Promise(resolve => setTimeout(resolve, USER_DELAY));
                        
                    } catch (err) {
                        console.error(`❌ Failed to send to ${user.userId}:`, err.message);
                        failCount++;
                        failedUsers.push(user.userId);

                        if (err.message.includes('429') || err.message.includes('flood')) {
                            console.log('⚠️ Rate limit hit, waiting 10 seconds...');
                            await new Promise(resolve => setTimeout(resolve, 10000));
                        }
                    }
                }

                if (i + BATCH_SIZE < users.length) {
                    console.log(`⏳ Waiting ${BATCH_DELAY/1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
                }
            }

            console.log(`
╔══════════════════════════════════╗
║     📊 BROADCAST COMPLETE        ║
╠══════════════════════════════════╣
║ ✅ Successful: ${successCount.toString().padStart(5)} users        ║
║ ❌ Failed: ${failCount.toString().padStart(7)} users        ║
║ 👥 Total: ${users.length.toString().padStart(7)} users        ║
╚══════════════════════════════════╝
            `);

            if (failedUsers.length > 0) {
                console.log('❌ Failed user IDs:', failedUsers.join(', '));
            }

        } catch (err) {
            console.error('❌ Broadcast system error:', err.message);
        }
    })();
});

// ==================== WITHDRAWAL NOTIFICATION ENDPOINT ====================
app.post('/withdrawal-notify', async (req, res) => {
    const { userId, amount, status, reason, adminId } = req.body;
    
    if (Number(adminId) !== ADMIN_ID) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!userId || !amount || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        let message;
        
        if (status === 'completed') {
            message = `✅ သင်၏ ငွေထုတ်တောင်းဆိုမှု အတည်ပြုပြီးပါပြီ။\n\n` +
                     `💰 ပမာဏ: ${amount.toLocaleString()} ဒင်္ဂါး\n` +
                     `📅 ရက်စွဲ: ${new Date().toLocaleDateString('my-MM')}\n\n` +
                     `✨ ကျေးဇူးတင်ပါသည်။`;
        } 
        else if (status === 'rejected') {
            message = `❌ သင်၏ ငွေထုတ်တောင်းဆိုမှု ငြင်းပယ်ခံရပါသည်။\n\n` +
                     `💰 ပမာဏ: ${amount.toLocaleString()} ဒင်္ဂါး\n` +
                     `📝 အကြောင်းရင်း: ${reason || 'အကြောင်းပြချက် မရှိပါ'}\n\n` +
                     `💫 ငွေပမာဏကို သင့်အကောင့်သို့ ပြန်လည်ထည့်သွင်းပေးထားပါသည်။`;
        } 
        else {
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
        
        if (err.message.includes('blocked')) {
            return res.status(200).json({ 
                success: false, 
                error: 'User has blocked the bot' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

// ==================== Error Handler ====================
app.use((err, req, res, next) => {
    console.error('❌ Express error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// ==================== Start Server ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════╗
║    🤖 PayCoinADS Bot is Ready!       ║
╠══════════════════════════════════════╣
║ 📡 Port: ${PORT.toString().padEnd(33)} ║
║ 👑 Admin ID: ${ADMIN_ID.toString().padEnd(30)} ║
║ 🌐 API: ${API_BASE_URL.replace('https://', '').padEnd(27)} ║
║ 🔄 Polling: Active                      ║
╚══════════════════════════════════════╝
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
