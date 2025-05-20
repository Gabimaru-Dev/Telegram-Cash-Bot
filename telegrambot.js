const { Telegraf } = require('telegraf');
const fs = require('fs');
const express = require('express');

const bot = new Telegraf('8174762710:AAG0-lRsZCXDmaPFiPQlB2pXzUQ4ydszqko'); // Replace with your actual bot token
const CHANNEL_USERNAME = '@gabimarutechchannel';
const MIN_WITHDRAWAL = 75000;
const usersFile = './users.json';

// Keep-alive server to prevent Render sleep
const app = express();
app.get('/', (_, res) => res.send('Bot is alive!'));
app.listen(process.env.PORT || 3000, () => console.log('Web server running.'));

function loadUsers() {
  if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '{}');
  return JSON.parse(fs.readFileSync(usersFile));
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function ensureUser(ctx) {
  const users = loadUsers();
  const id = ctx.from.id;
  if (!users[id]) {
    users[id] = {
      id,
      name: ctx.from.first_name,
      username: ctx.from.username || '',
      balance: 0,
      referrals: [],
      referredBy: null,
    };
    saveUsers(users);
  }
  return users[id];
}

bot.start(async (ctx) => {
  const users = loadUsers();
  const id = ctx.from.id;
  const ref = ctx.message.text.split(' ')[1];

  if (!users[id]) {
    users[id] = {
      id,
      name: ctx.from.first_name,
      username: ctx.from.username || '',
      balance: 0,
      referrals: [],
      referredBy: ref || null,
    };

    // Add bonus to referrer
    if (ref && users[ref] && ref !== String(id)) {
      users[ref].referrals.push(id);
      users[ref].balance += 250;
    }

    saveUsers(users);
  }

  const member = await ctx.telegram.getChatMember(CHANNEL_USERNAME, id).catch(() => null);

  if (!member || ['left', 'kicked'].includes(member.status)) {
    return ctx.reply(`You must join our channel to use this bot:\n${CHANNEL_USERNAME}`);
  }

  ctx.reply(`Welcome ${ctx.from.first_name}!\n\nEarn free money by referring friends and completing tasks.\n\nUse /menu to get started.`);
});

bot.command('menu', (ctx) => {
  const user = ensureUser(ctx);
  const refLink = `https://t.me/${ctx.me}?start=${ctx.from.id}`;
  ctx.replyWithHTML(`
<b>Your Balance:</b> ₦${user.balance}
<b>Total Referrals:</b> ${user.referrals.length}

<b>Your Referral Link:</b>
${refLink}

Use /tasks to earn more.
Use /withdraw to withdraw (Min: ₦${MIN_WITHDRAWAL}).
Use /advertise to promote your own channel.
  `);
});

bot.command('tasks', (ctx) => {
  ctx.reply(`
Tasks to Earn More:
1. Follow our partner channels.
2. Submit your username to verify completion.
3. New tasks coming soon!
  `);
});

bot.command('withdraw', (ctx) => {
  const user = ensureUser(ctx);
  if (user.balance < MIN_WITHDRAWAL) {
    return ctx.reply(`You need at least ₦${MIN_WITHDRAWAL} to withdraw. Keep referring and completing tasks!`);
  }
  ctx.reply(`Withdrawal request received. Our team will contact you shortly.`);
});

bot.command('advertise', (ctx) => {
  ctx.reply(`Want to advertise your bot or channel?\n\nContact @AyodeleBamidele on Telegram or WhatsApp.`);
});

bot.launch();
