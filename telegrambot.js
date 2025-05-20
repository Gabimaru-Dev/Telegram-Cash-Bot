const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = '7539636237:AAEVPGhdTopI2UfxcVT0qwxcJJl7dGQfdv8';
const CHANNEL = '@tgsclservice'; // Required subscription channel

const bot = new Telegraf(BOT_TOKEN);
let users = {};

// Load users if exists
if (fs.existsSync('users.json')) {
  users = JSON.parse(fs.readFileSync('users.json'));
}

// Save user data to file
function saveUsers() {
  fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}

// Start Command
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();

  // Check if user is new
  if (!users[userId]) {
    const ref = ctx.message.text.split(' ')[1]; // referral code
    users[userId] = {
      id: userId,
      balance: 0,
      referrals: [],
      tasksDone: [],
    };

    // Add referrer bonus
    if (ref && ref !== userId && users[ref]) {
      users[ref].balance += 5000;
      users[ref].referrals.push(userId);
      await bot.telegram.sendMessage(ref, `You got ₦5,000 for referring @${ctx.from.username || ctx.from.first_name}`);
    }

    saveUsers();
  }

  // Ask to join the channel first
  try {
    const member = await ctx.telegram.getChatMember(CHANNEL, userId);
    if (!['member', 'administrator', 'creator'].includes(member.status)) {
      return ctx.reply(`You must join our channel first:\n${CHANNEL}`);
    }
  } catch (e) {
    return ctx.reply(`Please join our channel to continue:\n${CHANNEL}`);
  }

  sendHome(ctx);
});

// Main menu
function sendHome(ctx) {
  const userId = ctx.from.id.toString();
  const bal = users[userId]?.balance || 0;
  ctx.reply(
    `👤 *${ctx.from.first_name}'s Account*\n\n` +
    `💰 *Balance:* ₦${bal.toLocaleString()}\n` +
    `👥 *Referrals:* ${users[userId].referrals.length}\n\n` +
    `Earn money by referring and completing tasks!`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('💸 Earn', 'earn'), Markup.button.callback('📤 Withdraw', 'withdraw')],
        [Markup.button.callback('👥 Referrals', 'referrals'), Markup.button.callback('📢 Advertise', 'advertise')],
      ])
    }
  );
}

// Button Handlers
bot.action('earn', async (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText(
    `📋 *Available Tasks:*\n\n` +
    `1. Join this channel: @earnwithusdaily\n` +
    `2. Join this group: @gabimarutechchannel\n` +
    `3. Join this group: @nairamastergroup\n\n` +
    `Click "I've Done It" after joining. You can also advertise your channel`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("✅ I've Done It", 'done_tasks')],
        [Markup.button.callback("⬅️ Back", 'back')]
      ])
    }
  );
});

bot.action('done_tasks', async (ctx) => {
  const userId = ctx.from.id.toString();
  if (!users[userId].tasksDone.includes('channel')) {
    users[userId].balance += 5000;
    users[userId].tasksDone.push('channel');
    saveUsers();
    ctx.reply('✅ Task completed! ₦5,000 added to your balance.');
  } else {
    ctx.reply('You already completed this task.');
  }
  sendHome(ctx);
});

bot.action('referrals', (ctx) => {
  const userId = ctx.from.id.toString();
  const link = `https://t.me/${ctx.me}?start=${userId}`;
  ctx.answerCbQuery();
  ctx.editMessageText(
    `👥 *Referral Program*\n\n` +
    `You earn ₦5,000 for each person that joins using your link and completes a task.\n\n` +
    `🔗 Your referral link:\n${link}`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("⬅️ Back", 'back')]
      ])
    }
  );
});

bot.action('withdraw', (ctx) => {
  const userId = ctx.from.id.toString();
  const bal = users[userId].balance;
  ctx.answerCbQuery();
  if (bal >= 70000) {
    ctx.editMessageText(
      `💸 *Withdraw Request*\n\n` +
      `You can withdraw your ₦${bal.toLocaleString()}.\n\n` +
      `_Note: If your request is not completed in 2 hours, contact admin @ayokunledavid._`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback("⬅️ Back", 'back')]
        ])
      }
    );
  } else {
    ctx.editMessageText(
      `❌ You need at least ₦70,000 to withdraw.\n\nYour current balance is ₦${bal.toLocaleString()}.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback("⬅️ Back", 'back')]
        ])
      }
    );
  }
});

bot.action('advertise', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText(
    `📢 *Advertise Your Channel*\n\n` +
    `You can advertise on this bot! Contact the admin:\n\n` +
    `@ayokunledavid`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback("⬅️ Back", 'back')]
      ])
    }
  );
});

bot.action('back', (ctx) => {
  ctx.answerCbQuery();
  sendHome(ctx);
});

// Express keep-alive
app.get('/', (req, res) => {
  res.send('Bot is running');
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

bot.launch();
