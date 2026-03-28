const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

// Multer for receiving screenshot from web backend
const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ==================== Configuration ====================
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = 'https://paycoinads-telegram-app.vercel.app';
const ADMIN_PANEL_URL = 'https://paycoinads-telegram-app.vercel.app/admin.html?v=1.1';
const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const API_BASE_URL = process.env.API_BASE_URL || 'https://paycoinads-telegram-app.vercel.app';
const SUPPORT_GROUP_ID = -1003748580479; // Group ထဲကို auto forward လုပ်ဖို့
const SUPPORT_LINK = 'https://t.me/Paycoinmm'; // Admin ကိုဆက်သွယ်ရန် Link

if (!BOT_TOKEN || !ADMIN_ID) {
    console.error('❌ Missing Environment Variables!');
    process.exit(1);
}

// ==================== Global Variables ====================
let bot;
let isPolling = false;
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 5;
let CHANNEL_URL = 'https://t.me/PayCoinADS'; // Default channel link - admin ပြောင်းလို့ရမယ်

// ==================== Force clear webhook ====================
async function forceClearWebhook() {
    try {
        console.log('🔄 Force clearing webhook...');
        const res = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
        console.log('✅ Webhook cleared:', res.data.description);
        return true;
    } catch (err) {
        console.error('❌ Failed to clear webhook:', err.message);
        return false;
    }
}

// ==================== Initialize Bot ====================
async function initializeBot() {
    console.log('🚀 Initializing bot...');
    
    // Clear webhook before starting
    await forceClearWebhook();
    
    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        // Create new bot instance
        bot = new TelegramBot(BOT_TOKEN, { 
            polling: true,
            onlyFirstMatch: true
        });

        isPolling = true;
        restartAttempts = 0;
        
        console.log('✅ Bot polling started');
        
        // Set up command handlers
        setupCommandHandlers();
        
        // Get bot info
        const me = await bot.getMe();
        console.log(`🤖 Bot connected: @${me.username}`);
        
    } catch (err) {
        console.error('❌ Failed to initialize bot:', err.message);
        throw err;
    }
}

// ==================== Command Handlers ====================
function setupCommandHandlers() {
    if (!bot) return;

    // ==================== /start command with referral support ====================
    bot.onText(/\/start(?:\s+(\d+))?/, async (msg, match) => {
        console.log('📩 /start command received from user:', msg.from.id);
        
        const chatId = msg.chat.id;
        const referrerId = match[1]; // This will be undefined if no referral ID is provided
        
        // Build WebApp URL with or without referral
        let webAppUrl = WEB_APP_URL;
        if (referrerId) {
            webAppUrl = `${WEB_APP_URL}?startapp=${referrerId}`;
            console.log(`🔗 Referral ID detected: ${referrerId} - User will open app with startapp parameter`);
        } else {
            console.log(`🔗 No referral ID - User will open app normally`);
        }
        
        try {
            await bot.sendMessage(chatId, `မင်္ဂလာပါ PayCoinADS မှ ကြိုဆိုပါတယ်။ 🎉\n\nဂိမ်းဆော့ပြီးပိုက်ဆံရှာရန် အောက်က ခလုတ်ကို နှိပ်ပါ။`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🎮 Play Game', web_app: { url: webAppUrl } }],
                        [{ text: '📢 Join Channel', url: CHANNEL_URL }],
                        [{ text: '💬 Admin ကိုဆက်သွယ်ရန်', url: SUPPORT_LINK }]
                    ]
                }
            });
            console.log('✅ /start response sent to user:', chatId);
        } catch (err) {
            console.error('❌ /start error:', err.message);
        }
    });

    // ==================== /admin command ====================
    bot.onText(/\/admin/, (msg) => {
        console.log('📩 /admin command received from user:', msg.from.id);
        const chatId = msg.chat.id;
        
        if (msg.from.id === ADMIN_ID) {
            bot.sendMessage(chatId, '👑 Admin Panel သို့ ဝင်ရန် အောက်က ခလုတ်ကို နှိပ်ပါ။', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '👑 Open Admin Panel', web_app: { url: ADMIN_PANEL_URL } }]
                    ]
                }
            }).catch(err => console.error('❌ Admin message error:', err));
        } else {
            bot.sendMessage(chatId, '⛔ You are not Authorized.').catch(err => console.error('❌ Not admin message error:', err));
        }
    });

    // ==================== /setchannel command (Admin only) ====================
    bot.onText(/\/setchannel (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const newChannelLink = match[1].trim();
        
        // Admin check
        if (msg.from.id !== ADMIN_ID) {
            return bot.sendMessage(chatId, '⛔ ဒီ command ကို Admin မှသာ သုံးလို့ရပါတယ်။');
        }
        
        // Validate link (basic check)
        if (!newChannelLink.startsWith('https://t.me/') && !newChannelLink.startsWith('http://t.me/') && !newChannelLink.startsWith('t.me/')) {
            return bot.sendMessage(chatId, '❌ မှားယွင်းနေပါတယ်။ Channel link က t.me/ နဲ့ စရပါမယ်။\n\nဥပမာ: /setchannel https://t.me/PayCoinADS');
        }
        
        // Update channel URL
        CHANNEL_URL = newChannelLink;
        
        await bot.sendMessage(chatId, `✅ Channel link ကို အောက်ပါအတိုင်း ပြောင်းလိုက်ပါပြီ:\n${CHANNEL_URL}`);
        console.log(`📢 Admin changed channel link to: ${CHANNEL_URL}`);
    });

    // ==================== Text Message Handler - Forward to Group ====================
    bot.on('message', async (msg) => {
        // Skip if it's a command (starting with /)
        if (msg.text && msg.text.startsWith('/')) {
            return;
        }
        
        // Skip if it's the admin (admin messages don't need to be forwarded)
        if (msg.from.id === ADMIN_ID) {
            return;
        }
        
        // Only forward text messages (not photos, stickers, etc.)
        if (msg.text) {
            try {
                console.log(`📨 Forwarding message from user ${msg.from.id} to support group`);
                
                // Create a nice formatted message for the group
                const forwardMessage = 
                    `📩 *New Support Message*\n\n` +
                    `👤 *User:* ${msg.from.first_name || ''} ${msg.from.last_name || ''}\n` +
                    `🆔 *User ID:* \`${msg.from.id}\`\n` +
                    `📝 *Message:*\n${msg.text}\n\n` +
                    `_Reply to this user by sending a message starting with /reply ${msg.from.id}_`;
                
                // Send to group
                await bot.sendMessage(SUPPORT_GROUP_ID, forwardMessage, {
                    parse_mode: 'Markdown'
                });
                
                // Confirm to user that message was sent
                await bot.sendMessage(msg.chat.id, '✅ သင့်စာကို Admin ထံ ပို့ပေးလိုက်ပါပြီ။ မကြာမီ အကြောင်းပြန်ပါမယ်။');
                
                console.log(`✅ Message from user ${msg.from.id} forwarded to group`);
            } catch (err) {
                console.error('❌ Failed to forward message to group:', err.message);
                
                // Notify user that there was an error
                await bot.sendMessage(msg.chat.id, '❌ စာပို့ရာတွင် အဆင်မပြေမှုရှိသွားပါသည်။ နောက်မှ ထပ်ကြိုးစားကြည့်ပါ။');
            }
        }
    });

    // ==================== /reply command (Admin to reply to users) ====================
    bot.onText(/\/reply (\d+) (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        
        // Admin check (only group members can reply)
        if (msg.from.id !== ADMIN_ID && chatId !== SUPPORT_GROUP_ID) {
            return bot.sendMessage(chatId, '⛔ ဒီ command ကို Admin မှသာ သုံးလို့ရပါတယ်။');
        }
        
        const targetUserId = parseInt(match[1]);
        const replyMessage = match[2];
        
        try {
            await bot.sendMessage(targetUserId, 
                `📨 *Admin ထံမှ အကြောင်းပြန်စာ*\n\n${replyMessage}\n\n` +
                `_ပြဿနာရှိပါက ထပ်မံမေးမြန်းနိုင်ပါတယ်။_`, 
                { parse_mode: 'Markdown' }
            );
            
            await bot.sendMessage(chatId, `✅ စာကို ပြန်ပို့ပြီးပါပြီ။`);
            console.log(`📨 Admin replied to user ${targetUserId}`);
        } catch (err) {
            console.error(`❌ Failed to reply to user ${targetUserId}:`, err.message);
            await bot.sendMessage(chatId, `❌ စာပြန်မရပါ။ User က Bot ကို block ထားတာ ဖြစ်နိုင်ပါတယ်။`);
        }
    });

    // ==================== Polling error handler ====================
    bot.on('polling_error', async (error) => {
        console.error('❌ Polling error:', error.message);
        
        if (error.message.includes('409') || error.message.includes('Conflict')) {
            console.log('🔄 409 Conflict detected - restarting bot...');
            
            restartAttempts++;
            
            if (restartAttempts > MAX_RESTART_ATTEMPTS) {
                console.error('❌ Too many restart attempts, exiting...');
                process.exit(1);
            }
            
            try {
                if (isPolling) {
                    await bot.stopPolling();
                    isPolling = false;
                    console.log('✅ Polling stopped');
                }
                
                await forceClearWebhook();
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                await initializeBot();
                
            } catch (e) {
                console.error('❌ Recovery failed:', e.message);
            }
        }
    });
}

// ==================== Helper: Fetch Config ====================
async function getConfig(key) {
    try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/settings`, {
            headers: { 'X-Telegram-Init-Data': 'bot' },
            timeout: 5000
        });
        return res.data[key];
    } catch (err) {
        console.error('Failed to fetch config:', err.message);
        return null;
    }
}

// ==================== Express Server Setup ====================
const app = express();
app.use(express.json());

// ==================== Health Check ====================
app.get('/', (req, res) => res.send('🤖 PayCoinADS Bot is Running!'));
app.get('/health', (req, res) => res.send('OK'));
app.get('/status', (req, res) => {
    res.json({
        status: 'ok',
        polling: isPolling,
        channelUrl: CHANNEL_URL,
        timestamp: new Date().toISOString()
    });
});

// ==================== Fetch Profile Photo Endpoint ====================
app.post('/fetch-photo', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
        if (!bot || !isPolling) {
            return res.status(503).json({ error: 'Bot not ready' });
        }

        const photos = await bot.getUserProfilePhotos(userId, { limit: 1 });
        let photoUrl = null;

        if (photos.total_count > 0) {
            const fileId = photos.photos[0][0].file_id;
            const file = await bot.getFile(fileId);
            photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        }

        // Update user in database
        await axios.post(`${API_BASE_URL}/api/admin/users/${userId}/photo`, {
            photoUrl: photoUrl
        }, {
            headers: { 'X-Telegram-Init-Data': 'bot' },
            timeout: 5000
        });

        res.json({ success: true, photoUrl });
    } catch (err) {
        console.error('Error fetching photo:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== Broadcast Endpoint ====================
app.post('/broadcast', async (req, res) => {
    const { message, adminId } = req.body;

    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!bot || !isPolling) {
        return res.status(503).json({ error: 'Bot not ready' });
    }

    res.status(202).json({ status: 'started' });

    (async () => {
        console.log('📢 Broadcast started...');
        let successCount = 0, failCount = 0;
        const failedUsers = [];

        try {
            const usersRes = await axios.get(`${API_BASE_URL}/api/admin/users`, {
                headers: { 'X-Telegram-Init-Data': 'bot' },
                timeout: 15000
            });
            const users = usersRes.data.users || [];
            console.log(`👥 Total users to broadcast: ${users.length}`);

            const BATCH_SIZE = 50;
            const DELAY_MS = 3000;

            for (let i = 0; i < users.length; i += BATCH_SIZE) {
                const batch = users.slice(i, i + BATCH_SIZE);

                await Promise.all(batch.map(async (user) => {
                    try {
                        await bot.sendMessage(user.userId, message, { parse_mode: 'HTML' });
                        successCount++;
                    } catch (err) {
                        console.error(`Failed to send to user ${user.userId}:`, err.message);
                        failCount++;
                        failedUsers.push(user.userId);
                    }
                }));

                if (i + BATCH_SIZE < users.length) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                }
            }

            console.log(`✅ Broadcast completed. Success: ${successCount}, Failed: ${failCount}`);
            if (failedUsers.length > 0) {
                console.log('❌ Failed users:', failedUsers.join(', '));
            }
        } catch (err) {
            console.error('Broadcast error:', err);
        }
    })();
});

// ==================== Withdrawal Notification ====================
app.post('/withdrawal-notify', async (req, res) => {
    const { userId, amount, method, status, reason, adminId } = req.body;

    if (adminId !== ADMIN_ID) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!userId || !amount || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!bot || !isPolling) {
        return res.status(503).json({ error: 'Bot not ready' });
    }

    try {
        let message;
        const now = new Date().toLocaleString('my-MM', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        if (status === 'completed') {
            message = 
                `🎊 *ငွေထုတ်ယူမှု အောင်မြင်ပါသည်။* 🎊\n\n` +
                `လူကြီးမင်း တောင်းဆိုထားသော ငွေထုတ်ယူမှု (Withdrawal) အား စစ်ဆေးပြီး ` +
                `သင်၏ ငွေလွှဲအကောင့်ထဲသို့ ငွေများ အောင်မြင်စွာ လွှဲပြောင်းပေးပြီး ဖြစ်ပါသည်။ 💸\n\n` +
                `📝 *အချက်အလက်များ:*\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `💰 *ပမာဏ:* \`${amount} Coins\`\n` +
                `🏦 *နည်းလမ်း:* ${method ? method.toUpperCase() : 'N/A'}\n` +
                `🕒 *အချိန်:* ${now}\n` +
                `━━━━━━━━━━━━━━━━━━\n\n` +
                `PayCoinAds ကို ယုံကြည်စွာ အသုံးပြုပေးသည့်အတွက် ကျေးဇူးတင်ပါသည်။ ` +
                `ဆက်လက်ပြီး ဂိမ်းဆော့ရင်း ဒင်္ဂါးများ စုဆောင်းနိုင်ပါပြီ။ 🎮✨\n\n` +
                `✅ ငွေလက်ခံရရှိကြောင်းကို သင်၏ Wallet/Bank App တွင် ပြန်လည်စစ်ဆေးပေးပါရန်။`;
        } else if (status === 'rejected') {
            message = 
                `❌ *ငွေထုတ်ယူမှု ငြင်းပယ်ခံရပါသည်။*\n\n` +
                `လူကြီးမင်း၏ ငွေထုတ်ယူမှု တောင်းဆိုချက်မှာ အောက်ပါအကြောင်းပြချက်ကြောင့် မအောင်မြင်ပါ။\n\n` +
                `⚠️ *အကြောင်းပြချက်:* \n\`${reason || 'အကြောင်းပြချက် မရှိပါ'}\`\n\n` +
                `💰 *ပြန်အမ်းငွေ:* \`${amount} Coins\` ကို သင့်အကောင့်ထဲသို့ ပြန်လည် ထည့်သွင်းပေးထားပါသည်။\n\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `🕒 *အချိန်:* ${now}\n` +
                `━━━━━━━━━━━━━━━━━━\n\n` +
                `အချက်အလက်များကို ပြန်လည်စစ်ဆေးပြီးမှသာ နောက်တစ်ကြိမ် ထပ်မံတောင်းဆိုပေးပါရန် ` +
                `မေတ္တာရပ်ခံအပ်ပါသည်။ 🛠️`;
        } else {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await bot.sendMessage(userId, message, { 
            parse_mode: 'Markdown',
            disable_web_page_preview: true 
        });
        
        console.log(`✅ Withdrawal notification sent to user ${userId} (${status})`);
        res.json({ success: true });

    } catch (err) {
        console.error('❌ Withdrawal notification error:', err.message);
        if (err.message.includes('blocked')) {
            return res.status(200).json({ success: false, error: 'User has blocked the bot' });
        }
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== VIP Purchase Notify (Screenshot Forward to Admin) ====================
app.post('/vip-purchase-notify',
    uploadMiddleware.single('screenshot'),
    async (req, res) => {
    const purchaseId   = req.body.purchaseId   || '';
    const userId       = req.body.userId       || '';
    const userName     = req.body.userName     || '';
    const amount       = req.body.amount       || '5000';
    const paymentMethod = req.body.paymentMethod || '';

    if (!bot || !isPolling) {
        return res.status(503).json({ error: 'Bot not ready' });
    }

    try {
        const caption =
            `👑 *VIP Purchase Request*\n\n` +
            `👤 *User:* ${userName || userId}\n` +
            `🆔 *User ID:* \`${userId}\`\n` +
            `💰 *Amount:* ${amount} ကျပ်\n` +
            `🏦 *Method:* ${paymentMethod}\n` +
            `🛒 *Purchase ID:* \`${purchaseId}\`\n\n` +
            `Admin Panel မှ confirm ပေးပါ။`;

        if (req.file && req.file.buffer) {
            // Send actual image buffer directly — like KBZ backend
            await bot.sendPhoto(ADMIN_ID, req.file.buffer, {
                caption: caption,
                parse_mode: 'Markdown'
            });
        } else {
            // No screenshot — send text only
            await bot.sendMessage(ADMIN_ID, caption, { parse_mode: 'Markdown' });
        }

        console.log(`✅ VIP purchase screenshot forwarded to admin for user ${userId}`);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ VIP purchase notify error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== VIP Expired Notify ====================
app.post('/vip-expired-notify', async (req, res) => {
    const { userId } = req.body;
    if (!userId || !bot || !isPolling) return res.status(400).json({ error: 'Missing data or bot not ready' });
    try {
        await bot.sendMessage(parseInt(userId),
            `⏰ *VIP Mode သက်တမ်းကုန်သွားပါပြီ*\n\n` +
            `သင့် VIP Mode တစ်လသက်တမ်းကုန်သွားပါပြီ။\n` +
            `ဆက်လက် VIP Mode ရရှိနိုင်ရန် ထပ်မံဝယ်ယူနိုင်ပါတယ်။ 👑`,
            { parse_mode: 'Markdown' }
        );
        res.json({ success: true });
    } catch (err) {
        console.error('❌ VIP expired notify error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== VIP Confirmed Notify ====================
app.post('/vip-confirmed-notify', async (req, res) => {
    const { userId } = req.body;
    if (!userId || !bot || !isPolling) return res.status(400).json({ error: 'Missing data or bot not ready' });
    try {
        await bot.sendMessage(parseInt(userId),
            `🎉 *VIP Mode အတည်ပြုပြီးပါပြီ!*\n\n` +
            `Admin မှ သင့် VIP Mode ကို confirm ပေးပါပြီ။\n` +
            `App ထဲမှ VIP Mode ကို On/Off ပြောင်းနိုင်ပါပြီ။ 👑✨`,
            { parse_mode: 'Markdown' }
        );
        res.json({ success: true });
    } catch (err) {
        console.error('❌ VIP confirmed notify error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== Referral Notification Endpoint ====================
app.post('/referral-notify', async (req, res) => {
    const { referrerId, newUserId } = req.body;

    if (!referrerId || !newUserId) {
        return res.status(400).json({ error: 'Missing referrerId or newUserId' });
    }

    if (!bot || !isPolling) {
        return res.status(503).json({ error: 'Bot not ready' });
    }

    try {
        const message = 
            `🎊 *မင်္ဂလာပါ!* 🎊\n\n` +
            `လူကြီးမင်း၏ Link မှတစ်ဆင့် လူသစ်တစ်ယောက် ([အသုံးပြုသူ ${newUserId}](tg://user?id=${newUserId})) ဝင်ရောက်လာပါသဖြင့် *၁၀ Coins* လက်ဆောင် ရရှိပါသည်။\n\n` +
            `ကျေးဇူးတင်ပါသည်။ 🙏\n` +
            `PayCoinADS`;

        await bot.sendMessage(parseInt(referrerId), message, { 
            parse_mode: 'Markdown',
            disable_web_page_preview: true 
        });
        
        console.log(`✅ Referral notification sent to referrer ${referrerId} about new user ${newUserId}`);
        res.json({ success: true });

    } catch (err) {
        console.error('❌ Referral notification error:', err.message);
        if (err.message.includes('blocked')) {
            return res.status(200).json({ success: false, error: 'Referrer has blocked the bot' });
        }
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== Error Handler ====================
app.use((err, req, res, next) => {
    console.error('❌ Express error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// ==================== Start Server ====================
const PORT = process.env.PORT || 3000;

// Initialize bot first, then start server
initializeBot().then(() => {
    app.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════╗
║    🤖 PayCoinADS Bot is Ready!       ║
╠══════════════════════════════════════╣
║ 📡 Port: ${PORT.toString().padEnd(33)} ║
║ 👑 Admin ID: ${ADMIN_ID.toString().padEnd(30)} ║
║ 📢 Channel: ${CHANNEL_URL.slice(0, 30).padEnd(30)} ║
║ 💬 Support Group: ${SUPPORT_GROUP_ID.toString().padEnd(27)} ║
║ 🔄 Polling: Active                      ║
║ 🛡️ 409 Recovery: Enabled                ║
║ 🔁 Max Retries: ${MAX_RESTART_ATTEMPTS}                         ║
╚══════════════════════════════════════╝
        `);
    });
}).catch(err => {
    console.error('❌ Failed to initialize bot:', err);
    process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => {
    console.log('\n🛑 Stopping bot...');
    if (bot && isPolling) {
        bot.stopPolling();
    }
    process.exit(0);
});
process.once('SIGTERM', () => {
    console.log('\n🛑 Stopping bot...');
    if (bot && isPolling) {
        bot.stopPolling();
    }
    process.exit(0);
});
