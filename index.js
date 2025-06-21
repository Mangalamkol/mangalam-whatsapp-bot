const express = require("express");
const makeWASocket = require("@adiwajshing/baileys").default;
const { useSingleFileAuthState, DisconnectReason } = require("@adiwajshing/baileys");
const qrcode = require("qrcode");
const fs = require("fs");

const { state, saveState } = useSingleFileAuthState("./auth_info.json");

const app = express();
const PORT = process.env.PORT || 3000;

let sock;
let qrCodeString = "";

async function startBot() {
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    });

    sock.ev.on("creds.update", saveState);

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update;
        if (qr) {
            qrCodeString = await qrcode.toDataURL(qr);
        }

        if (connection === "close") {
            const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                startBot();
            }
        }
    });

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (text?.toLowerCase().includes("hello")) {
            await sock.sendMessage(from, { text: "Hi! Welcome to Mangalam WiFi Bot 💬" });
        }

        if (text?.toLowerCase().includes("coupon")) {
            await sock.sendMessage(from, { text: "Please complete payment to receive your coupon code." });
        }
    });
}

app.get("/", (req, res) => {
    res.send("✅ WhatsApp Bot is Running.");
});

app.get("/qr", (req, res) => {
    if (qrCodeString) {
        res.send(`<img src="${qrCodeString}" />`);
    } else {
        res.send("✅ QR already scanned or bot is connected.");
    }
});

startBot();

app.listen(PORT, () => console.log(`✅ Server is running on http://localhost:${PORT}`));
