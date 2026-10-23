const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

const ADMIN_1_ID = process.env.ADMIN_1_ID; // Main Admin (Can Reply to users)
const ADMIN_2_ID = process.env.ADMIN_2_ID; // Observer Admin

// HTML uchun xavfsiz tozalash funksiyasi
function escapeHTML(str) {
  if (!str) return '';
  return str
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// User ID'ni ajratib olish funksiyasi
function extractUserId(text) {
  if (!text) return null;
  const match = text.match(/#UID_(\d+)/);
  return match ? match[1] : null;
}

// Start komandasi
bot.start((ctx) => {
  const senderId = ctx.from.id.toString();
  if (senderId === ADMIN_1_ID || senderId === ADMIN_2_ID) {
    return ctx.reply("👋 Assalomu alaykum, Admin! Tizim tayyor. Kelgan xabarlar shu yerda ko'rinadi.");
  }
  ctx.reply("Assalomu alaykum! Savol yoki murojaatingizni yozib qoldiring. Tez orada javob beramiz.");
});

// Asosiy xabarlar ishlovchisi
bot.on(['text', 'photo', 'video', 'voice', 'audio', 'document', 'sticker'], async (ctx) => {
  const senderId = ctx.from.id.toString();
  const userName = escapeHTML(ctx.from.first_name || 'Foydalanuvchi');
  const usernameTag = ctx.from.username ? `@${escapeHTML(ctx.from.username)}` : 'Mavjud emas';

  // ----------------------------------------------------
  // 1. ADMIN 1 RESPONDING TO USER VIA REPLY
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
      if (ctx.message.text) {
        await bot.telegram.sendMessage(
          targetUserId, 
          `💬 <b>Admin javobi:</b>\n\n${escapeHTML(ctx.message.text)}`, 
          { parse_mode: 'HTML' }
        );
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
  // 2. ADMIN 2 SENDING MESSAGE TO ADMIN 1
  // ----------------------------------------------------
  if (senderId === ADMIN_2_ID) {
    // Agar Admin 2 oddiy foydalanuvchi xabariga javob bermoqchi bo'lsa (taqiqlanadi)
    if (ctx.message.reply_to_message) {
      return ctx.reply("⚠️ Sizda faqat kuzatish va Admin 1 ga yozish huquqi bor. Foydalanuvchilarga javob bera olmaysiz!");
    }

    // Admin 2 yozgan xabarni Admin 1 ga yo'naltirish
    const admin2Header = `💬 <b>Admin 2 dan xabar (Admin 1 ga):</b>\n\n`;
    try {
      if (ADMIN_1_ID) {
        if (ctx.message.text) {
          await bot.telegram.sendMessage(
            ADMIN_1_ID, 
            admin2Header + escapeHTML(ctx.message.text), 
            { parse_mode: 'HTML' }
          );
        } else {
          const admin2Caption = ctx.message.caption ? escapeHTML(ctx.message.caption) : '';
          await ctx.copyMessage(ADMIN_1_ID, {
            caption: admin2Header + admin2Caption,
            parse_mode: 'HTML'
          });
        }
      }
      return ctx.reply("✅ Xabaringiz Admin 1 ga yetkazildi!");
    } catch (err) {
      console.error("Admin 2 forwarding error:", err);
      return ctx.reply(`❌ Xatolik: ${err.message}`);
    }
  }

  // ----------------------------------------------------
  // 3. REGULAR USER SENDING MESSAGE TO ADMINS
  // ----------------------------------------------------
  const userText = ctx.message.text ? escapeHTML(ctx.message.text) : '';
  const userCaption = ctx.message.caption ? escapeHTML(ctx.message.caption) : '';

  const captionHeader = `📩 <b>Yangi Murojaat!</b>\n👤 <b>Ism:</b> ${userName}\n🌐 <b>Username:</b> ${usernameTag}\n🆔 <b>ID:</b> <code>#UID_${senderId}</code>\n\n`;
  const observerHeader = `👁 <b>[KUZATUV REJIMIDAGI XABAR]</b>\n👤 <b>Ism:</b> ${userName}\n🌐 <b>Username:</b> ${usernameTag}\n🆔 <b>ID:</b> <code>#UID_${senderId}</code>\n\n`;

  try {
    // Admin 1 ga yuborish
    if (ADMIN_1_ID) {
      if (ctx.message.text) {
        await bot.telegram.sendMessage(
          ADMIN_1_ID, 
          captionHeader + userText, 
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.copyMessage(ADMIN_1_ID, {
          caption: captionHeader + userCaption,
          parse_mode: 'HTML'
        });
      }
    }

    // Admin 2 (Kuzatuvchi) ga yuborish
    if (ADMIN_2_ID) {
      if (ctx.message.text) {
        await bot.telegram.sendMessage(
          ADMIN_2_ID, 
          observerHeader + userText, 
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.copyMessage(ADMIN_2_ID, {
          caption: observerHeader + userCaption,
          parse_mode: 'HTML'
        });
      }
    }

    // Foydalanuvchiga tasdiq xabari
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
    res.status(200).json({ error: err.message });
  }
};
