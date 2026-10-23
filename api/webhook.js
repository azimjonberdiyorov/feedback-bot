const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

const ADMIN_1_ID = process.env.ADMIN_1_ID; // Main Admin (Can Reply)
const ADMIN_2_ID = process.env.ADMIN_2_ID; // Observer Admin (Read Only)

// Helper function to extract user ID from custom tag or message text
function extractUserId(text) {
  if (!text) return null;
  const match = text.match(/#UID_(\d+)/);
  return match ? match[1] : null;
}

// User Start Command
bot.start((ctx) => {
  if (ctx.from.id.toString() === ADMIN_1_ID || ctx.from.id.toString() === ADMIN_2_ID) {
    return ctx.reply("👋 Assalomu alaykum, Admin! Tizim tayyor. Kelgan xabarlar shu yerda ko'rinadi.");
  }
  ctx.reply("Assalomu alaykum! Savol yoki murojaatingizni yozib qoldiring. Tez orada javob beramiz.");
});

// Main Message Handler
bot.on(['text', 'photo', 'video', 'voice', 'audio', 'document', 'sticker'], async (ctx) => {
  const senderId = ctx.from.id.toString();
  const userName = ctx.from.first_name || 'Foydalanuvchi';
  const usernameTag = ctx.from.username ? `@${ctx.from.username}` : 'Mavjud emas';

  // ----------------------------------------------------
  // 1. ADMIN 1 RESPONDING VIA REPLY
  // ----------------------------------------------------
  if (senderId === ADMIN_1_ID) {
    if (!ctx.message.reply_to_message) {
      return ctx.reply("⚠️ Foydalanuvchiga javob berish uchun kelgan xabarga 'Reply' qiling.");
    }

    const replyMsg = ctx.message.reply_to_message;
    const targetUserId = extractUserId(replyMsg.text || replyMsg.caption);

    if (!targetUserId) {
      return ctx.reply("❌ Ushbu xabardan Foydalanuvchi ID si topilmadi.");
    }

    try {
      // Send admin's reply back to target user
      if (ctx.message.text) {
        await bot.telegram.sendMessage(targetUserId, `💬 **Admin javobi:**\n\n${ctx.message.text}`, { parse_mode: 'Markdown' });
      } else {
        await ctx.copyMessage(targetUserId);
      }
      return ctx.reply("✅ Javobingiz foydalanuvchiga yetkazildi!");
    } catch (err) {
      if (err.code === 403) {
        return ctx.reply("❌ Foydalanuvchi botni bloklagan, javob yetkazilmadi.");
      }
      return ctx.reply(`❌ Xatolik yuz berdi: ${err.message}`);
    }
  }

  // ----------------------------------------------------
  // 2. ADMIN 2 TRYING TO REPLY (BLOCKED)
  // ----------------------------------------------------
  if (senderId === ADMIN_2_ID) {
    if (ctx.message.reply_to_message) {
      return ctx.reply("⚠️ Sizda faqat kuzatish huquqi bor. Javob yubora olmaysiz!");
    }
    return ctx.reply("ℹ️ Siz kuzatuvchi adminsiz.");
  }

  // ----------------------------------------------------
  // 3. REGULAR USER SENDING MESSAGE TO ADMINS
  // ----------------------------------------------------
  const captionHeader = `📩 **Yangi Murojaat!**\n👤 **Ism:** ${userName}\n🌐 **Username:** ${usernameTag}\n🆔 **ID:** \`#UID_${senderId}\`\n\n`;
  const observerHeader = `👁 **[KUZATUV REJIMIDAGI XABAR]**\n👤 **Ism:** ${userName}\n🌐 **Username:** ${usernameTag}\n🆔 **ID:** \`#UID_${senderId}\`\n\n`;

  try {
    // Send to Admin 1
    if (ADMIN_1_ID) {
      if (ctx.message.text) {
        await bot.telegram.sendMessage(ADMIN_1_ID, captionHeader + ctx.message.text, { parse_mode: 'Markdown' });
      } else {
        await ctx.copyMessage(ADMIN_1_ID, {
          caption: captionHeader + (ctx.message.caption || ''),
          parse_mode: 'Markdown'
        });
      }
    }

    // Send to Admin 2 (Observer)
    if (ADMIN_2_ID) {
      if (ctx.message.text) {
        await bot.telegram.sendMessage(ADMIN_2_ID, observerHeader + ctx.message.text, { parse_mode: 'Markdown' });
      } else {
        await ctx.copyMessage(ADMIN_2_ID, {
          caption: observerHeader + (ctx.message.caption || ''),
          parse_mode: 'Markdown'
        });
      }
    }

    // Acknowledge to User
    await ctx.reply("✅ Xabaringiz adminga yetkazildi! Tez orada javob beramiz.");
  } catch (error) {
    console.error("Forwarding error:", error);
  }
});

// Vercel Serverless Export
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      res.status(200).json({ status: 'ok' });
    } else {
      res.status(200).send('Telegram Feedback Bot is active!');
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(200).json({ error: err.message }); // Always reply HTTP 200 so Telegram won't get stuck
  }
};
