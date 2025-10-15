import { WAMessageStubType } from '@whiskeysockets/baileys';
import PhoneNumber from 'awesome-phonenumber';
import chalk from 'chalk';
import { watchFile } from 'fs';

export default async function (m, conn = { user: {} }) {
  try {
    // When sending in a group from the bot itself, m.sender can be the group JID.
    // Normalize to a real user JID for display so phone formatting works.
    const senderJid = (m.isGroup && m.fromMe) ? (conn.user?.jid || m.sender) : m.sender;
  const senderNumber = (senderJid || '').replace(/@.+$/, '');
  const plusPrefixed = senderNumber.startsWith('+') ? senderNumber : ('+' + senderNumber)
  const intl = PhoneNumber(plusPrefixed).getNumber('international') || plusPrefixed;
  const _name = await safeGetName(conn, senderJid);
  const sender = `${intl}${_name ? ' ~' + _name : ''}`;
  const chat = await safeGetName(conn, m.chat);

    const filesize = calculateFileSize(m);
  const user = global.db.data.users[senderJid] || global.db.data.users[m.sender];
  const myNumRaw = String(conn.user?.jid || '').replace('@s.whatsapp.net', '')
  const me = PhoneNumber(myNumRaw.startsWith('+') ? myNumRaw : ('+' + myNumRaw)).getNumber('international');
    logMessage(me, conn.user.name, m, chat, filesize, sender, user);

    await handleTextFormatting(m, conn);
  } catch (error) {
    console.error('Error processing message:', error);
  }
}

async function safeGetName(conn, jid) {
  try {
    return await Promise.resolve(conn.getName(jid));
  } catch {
    return '';
  }
}

function calculateFileSize(m) {
  return (m.msg?.vcard?.length || m.msg?.fileLength?.low || m.msg?.text?.length || 0) || 0;
}

function logMessage(me, name, m, chat, filesize, sender, user) {
  console.log(`
  ▣ ${chalk.redBright('%s')}
  │⏰ ${chalk.black(chalk.bgYellow('%s'))}
  │📑 ${chalk.black(chalk.bgGreen('%s'))}
  │📊 ${chalk.magenta('%s [%s %sB]')}
  │📤 ${chalk.green('%s')}
  │📪 ${chalk.yellow('%s%s')}
  │📥 ${chalk.green('%s')}
  │💬 ${chalk.black(chalk.bgYellow('%s'))}
  │📜 ${chalk.cyan('%s')}
  ▣──────···
  `.trim(),
    `${me} ~ ${name}`,
    (m.messageTimestamp ? new Date(1000 * (m.messageTimestamp.low || m.messageTimestamp)) : new Date()).toTimeString(),
    m.messageStubType ? WAMessageStubType[m.messageStubType] : '',
    filesize,
    filesize === 0 ? 0 : (filesize / 1009 ** Math.floor(Math.log(filesize) / Math.log(1000))).toFixed(1),
    ['', ...'KMGTP'][Math.floor(Math.log(filesize) / Math.log(1000))] || '',
    sender,
    m?.exp || '?',
  user ? `|${user.exp}| |${user.limit}` : `| |`,
    m.chat + (chat ? ' ~' + chat : ''),
    m.mtype ? m.mtype.replace(/message$/i, '').replace('audio', m.msg.ptt ? 'PTT' : 'audio').replace(/^./, v => v.toUpperCase()) : '',
    m.text || ''
  );
}

async function handleTextFormatting(m, conn) {
  if (typeof m.text === 'string' && m.text) {
    let log = m.text.replace(/\u200e+/g, '');
  }
}
