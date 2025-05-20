const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fs = require('fs');
const axios = require('axios');

const CHANNELS_TO_FOLLOW = [
  'gabimarutechchannel',
  'sisterchannel1',
  'promochannel2'
]; // add all channels user must subscribe to

const SUBSCRIPTION_CHANNEL = 'gabimarutechchannel'; // main channel to check subscription

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

const bot = new Telegraf(BOT_TOKEN);

// Simple users DB in JSON
let users = {};
if (fs.existsSync('users.json')) {
  users = JSON.parse(fs.readFileSync('users.json'));
}

function saveUsers() {
  fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}

function getReferralLink(userId) {
  return `https://t.me/YourBotUsername?start=${userId}`;
}

// Check if user subscribed to a channel
async function isSubscribedToChannel(ctx, channel) {
  try {
    const member = await ctx.telegram.getChatMember(`@${channel}`, ctx.from.id);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch {
    return false;
  }
}

// Check if user subscribed to all required channels (tasks)
async function checkAllTasks(ctx) {
  const results = [];
  for (const channel of CHANNELS_TO_FOLLOW) {
    const subscribed = await isSubscribedToChannel(ctx, channel);
    results.push({ channel, subscribed });
  }
  return results;
}

// Add balance helper
function addBalance(userId, amount) {
  if (!users[userId]) users[userId] = { balance: 0, referrals: [], joinedTasks: [] };
  users[userId].balance += amount;
  saveUsers();
}

// Express to keep bot alive on Render
const app = express();
app.get('/', (req, res) => {
  res.send('Bot is alive!');
});
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

// Prevent Render sleep by self-pinging every 5 minutes
setInterval(() => {
  axios.get(`http://localhost:${PORT}/`).catch(() => {});
}, 5 * 60 * 1000);

// Telegram bot handlers

bot.start(async (ctx) => {
  const fromId = ctx.from.id.toString();
  const args = ctx.message.text.split(' ');
  const ref = args[1];

  // Check main subscription first
  if (!await isSubscribedToChannel(ctx, SUBSCRIPTION_CHANNEL)) {
    return ctx.reply(`❌ Please join our channel @${SUBSCRIPTION_CHANNEL} to use this bot.`);
  }

  if (!users[fromId]) {
    users[fromId] = { balance: 0, referrals: [], joinedTasks: [] };

    if (ref && ref !== fromId && users[ref]) {
      addBalance(ref, 500); // ₦500 referral bonus
      users[ref].referrals.push(fromId);
      ctx.telegram.sendMessage(ref, `🎉 New referral! Your balance increased by ₦500.`);
    }

    saveUsers();
  }

  const referralLink = getReferralLink(fromId);

  ctx.replyWithMarkdown(`Welcome! Your balance: ₦${users[fromId].balance}\n\n*Referral link:* \n${referralLink}\n\nComplete tasks by subscribing to these channels to earn more:\n${CHANNELS_TO_FOLLOW.map(c => '@' + c).join('\n')}`, Markup.inlineKeyboard([
    [Markup.button.callback('Check Tasks ✅', 'check_tasks')],
    [Markup.button.callback('Withdraw 💸', 'withdraw')],
    [Markup.button.callback('Advertise 📢', 'advertise')],
  ]));
});

bot.action('check_tasks', async (ctx) => {
  const fromId = ctx.from.id.toString();
  if (!users[fromId]) return ctx.reply('Please start with /start first.');

  const status = await checkAllTasks(ctx);

  let replyText = 'Your task subscription status:\n\n';

  let earnedThisCheck = 0;

  status.forEach(({ channel, subscribed }) => {
    const hasJoinedBefore = users[fromId].joinedTasks.includes(channel);
    if (subscribed && !hasJoinedBefore) {
      // Reward user for new subscription task completion
      users[fromId].balance += 1000; // ₦1000 per new subscribed channel
      users[fromId].joinedTasks.push(channel);
      earnedThisCheck += 1000;
    }
    replyText += `${subscribed ? '✅' : '❌'} @${channel}\n`;
  });

  saveUsers();

  replyText += `\nYou earned ₦${earnedThisCheck} from new subscriptions.\nYour balance: ₦${users[fromId].balance}`;

  ctx.reply(replyText);
});

bot.action('withdraw', (ctx) => {
  const fromId = ctx.from.id.toString();
  if (!users[fromId]) return ctx.reply('Please start with /start first.');

  if (users[fromId].balance < 75000) {
    return ctx.reply(`You need at least ₦75,000 to withdraw. Your balance is ₦${users[fromId].balance}`);
  }

  ctx.reply('Withdrawal request received! Processing... (This is a prank!)');
  // Optionally reset balance or keep it as prank
});

bot.action('advertise', (ctx) => {
  ctx.reply('Send your channel link and a short description to advertise it:');

  bot.once('text', (ctx2) => {
    if (!ctx2.message.text.startsWith('http')) return ctx2.reply('Please send a valid channel link.');

    ctx2.reply('Thanks! Your advertisement request is received and will be reviewed.');
  });
});

// Launch bot
bot.launch().then(() => console.log('Bot started...'));
