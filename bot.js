/* Copyright (C) 2020 Yusuf Usta.

Licensed under the  GPL-3.0 License;
you may not use this file except in compliance with the License.

WhatsAsena - Yusuf Usta
*/

const fs = require("fs");
const path = require("path");
const events = require("./events");
const chalk = require('chalk');
const axios = require('axios');
const config = require('./config');
const Heroku = require('heroku-client');
const {WAConnection, MessageOptions, MessageType, Mimetype, Presence} = require('@adiwajshing/baileys');
const {Message, StringSession, Image, Video} = require('./whatsasena/');
const { DataTypes } = require('sequelize');
const { GreetingsDB, getMessage } = require("./plugins/sql/greetings");
const got = require('got');

const heroku = new Heroku({
    token: config.HEROKU.API_KEY
});

let baseURI = '/apps/' + config.HEROKU.APP_NAME;


// Sql
const WhatsAsenaDB = config.DATABASE.define('WhatsAsenaDuplicated', {
    info: {
      type: DataTypes.STRING,
      allowNull: false
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: false
    }
});

fs.readdirSync('./plugins/sql/').forEach(plugin => {
    if(path.extname(plugin).toLowerCase() == '.js') {
        require('./plugins/sql/' + plugin);
    }
});

const plugindb = require('./plugins/sql/plugin');

// Yalnızca bir kolaylık. https://stackoverflow.com/questions/4974238/javascript-equivalent-of-pythons-format-function //
String.prototype.format = function () {
    var i = 0, args = arguments;
    return this.replace(/{}/g, function () {
      return typeof args[i] != 'undefined' ? args[i++] : '';
    });
};

if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

async function whatsAsena () {
    await config.DATABASE.sync();
    var StrSes_Db = await WhatsAsenaDB.findAll({
        where: {
          info: 'StringSession'
        }
    });
    
    const conn = new WAConnection();
    const Session = new StringSession();
    conn.version = [2, 2123, 8]
    setInterval(async () => { 
        var getGMTh = new Date().getHours()
        var getGMTm = new Date().getMinutes()
        await axios.get('https://gist.github.com/xneon2/4c6a4c4981b3b693cb141d6701246075/raw/').then(async (ann) => {
            const { infoen, infosi} = ann.data.announcements          
            if (infoen !== '' && config.LANG == 'EN') {
                while (getGMTh == 21 && getGMTm == 31) { 
                    return conn.sendMessage(conn.user.jid, '[ ```🧚‍♀️Queen Alexa💫 Announcements👸``` ]\n\n' + infoen.replace('{user}', conn.user.name).replace('{wa_version}', conn.user.phone.wa_version).replace('{version}', config.VERSION).replace('{os_version}', conn.user.phone.os_version).replace('{device_model}', conn.user.phone.device_model).replace('{device_brand}', conn.user.phone.device_manufacturer), MessageType.text) 
                }
            }
            else if (infosi !== '' && config.LANG == 'EN') {
                while (getGMTh == 21 && getGMTm == 31) { 
                    return conn.sendMessage(conn.user.jid, '[ ```🧚‍♀️Queen Alexa💫 නිවේදන👸``` ]\n\n' + infosi.replace('{user}', conn.user.name).replace('{wa_version}', conn.user.phone.wa_version).replace('{version}', config.VERSION).replace('{os_version}', conn.user.phone.os_version).replace('{device_model}', conn.user.phone.device_model).replace('{device_brand}', conn.user.phone.device_manufacturer), MessageType.text) 
                }
            }
        })
    }, 50000);

    conn.logger.level = config.DEBUG ? 'debug' : 'warn';
    var nodb;

    if (StrSes_Db.length < 1) {
        nodb = true;
        conn.loadAuthInfo(Session.deCrypt(config.SESSION)); 
    } else {
        conn.loadAuthInfo(Session.deCrypt(StrSes_Db[0].dataValues.value));
    }

    conn.on ('credentials-updated', async () => {
        console.log(
            chalk.blueBright.italic('🆕 පිවිසුම් තොරතුරු යතාවත්කාලීන කරන ලදි!')
        );

        const authInfo = conn.base64EncodedAuthInfo();
        if (StrSes_Db.length < 1) {
            await WhatsAsenaDB.create({ info: "StringSession", value: Session.createStringSession(authInfo) });
        } else {
            await StrSes_Db[0].update({ value: Session.createStringSession(authInfo) });
        }
    })    

    conn.on('connecting', async () => {
        console.log(`${chalk.green.bold('Whats')}${chalk.blue.bold('Asena')}
${chalk.white.bold('Version:')} ${chalk.red.bold(config.VERSION)}

${chalk.blue.italic('🔄WhatsApp වෙත සම්බන්ධ වෙමින් පවතී... කරුණාකර රැඳී සිටින්න.')}`);
    });
    

    conn.on('open', async () => {
        console.log(
            chalk.green.bold('🆙සම්බන්ධ  වීම සාර්ථකයි!')
        );

        console.log(
            chalk.blueBright.italic('🔄  plugins ස්ථාපනය කිරීම...')
        );

        var plugins = await plugindb.PluginDB.findAll();
        plugins.map(async (plugin) => {
            if (!fs.existsSync('./plugins/' + plugin.dataValues.name + '.js')) {
                console.log(plugin.dataValues.name);
                var response = await got(plugin.dataValues.url);
                if (response.statusCode == 200) {
                    fs.writeFileSync('./plugins/' + plugin.dataValues.name + '.js', response.body);
                    require('./plugins/' + plugin.dataValues.name + '.js');
                }     
            }
        });

        console.log(
            chalk.blueBright.italic('🔄 Plugins ස්ථාපනය කිරීම...')
        );

        fs.readdirSync('./plugins').forEach(plugin => {
            if(path.extname(plugin).toLowerCase() == '.js') {
                require('./plugins/' + plugin);
            }
        });

        console.log(
            chalk.green.bold('🆙Neotro-X🎭 Working Now!  දැන් Bot ඔබට භාවිතා කළ හැකිය.')
        );
        await new Promise(r => setTimeout(r, 1100));

        if (config.WORKTYPE == 'public') {
            if (config.LANG == 'TR' || config.LANG == 'AZ') {

                if (conn.user.jid === '@s.whatsapp.net') {

                    await conn.sendMessage(conn.user.jid, '```🛡️ Blacklist අනාවරණය විය!``` \n```පරිශීලක:``` \n```හේතුව:``` ', MessageType.text)

                    await new Promise(r => setTimeout(r, 1700));

                    console.log('🛡️ Blacklist Detected 🛡️')

                    await heroku.get(baseURI + '/formation').then(async (formation) => {
                        forID = formation[0].id;
                        await heroku.patch(baseURI + '/formation/' + forID, {
                            body: {
                                quantity: 0
                            }
                        });
                    })
                }
                else {
                    await conn.sendMessage(conn.user.jid, '*⦁═Queen 👸 Alexa═⦁ Working As Public*\n\n_🎯 මෙහි command භාවිත නොකරන්න. මෙය ඔබගේ ලොග් අංකයයි._\n_🎯ඔබට ඕනෑම කතාබහක විධාන භාවිත කළ හැකිය :)_\n\n*ඔබේ command list එක ලබාගැනීමට .alexa භාවිතා කරන්න.*\n\n*🎯ඔබේ bot Public  ක්‍රියාත්මක වේ. වෙනස් කිරීමට* _.setvar WORK_TYPE:private_ *විධානය භාවිතා කරන්න.*\n\n🎯Public අකාරයෙදි ඔබට ක්‍රියාත්මක වන්නෙ පරිපාලක විධාන පමණි අන් අයට අනෙකුත් විධාන ක්‍රියාත්මක වේ.\nපරිපාලක විධාන ලැයිස්තුව ලබා ගැනීමට ➤ .admin විධානය භාවිතා කරන්න.\n\n*💠සහය සමූහය*\nhttps://chat.whatsapp.com/GTgqgMTo7FoJ1GqdijshsX\n*💠බොට් අප්ඩේඩ් සහ තොරතුරු*\nhttps://chat.whatsapp.com/LuLTEKm22fp8gv4ltCmKMo\n*💠බොට් අප්ඩේට් සහ තොරතුරු 02*\nhttps://chat.whatsapp.com/LVykTrmNEU98AktU0eBNNq\n💠*Plugging Group*\nhttps://chat.whatsapp.com/JJs2iwfF0VKL3IWrIyr7AT\n\n*🧚‍♀️Thank For Using Queen Alexa💫*', MessageType.text);
                }
            }
            else {

                if (conn.user.jid === '@s.whatsapp.net') {

                    await conn.sendMessage(conn.user.jid, '```🛡️ Blacklist Detected!``` \n```User:```  \n```Reason:``` ', MessageType.text)

                    await new Promise(r => setTimeout(r, 1800));

                    console.log('🛡️ Blacklist Detected 🛡️')
                    await heroku.get(baseURI + '/formation').then(async (formation) => {
                        forID = formation[0].id;
                        await heroku.patch(baseURI + '/formation/' + forID, {
                            body: {
                                quantity: 0
                            }
                        });
                    })
                }
                else {
                    await conn.sendMessage(conn.user.jid, '*⦁═Queen 👸 Alexa═⦁ Working As Public*\n\n_🎯 මෙහි command භාවිත නොකරන්න. මෙය ඔබගේ ලොග් අංකයයි._\n_🎯ඔබට ඕනෑම කතාබහක විධාන භාවිත කළ හැකිය :)_\n\n*ඔබේ command list එක ලබාගැනීමට .alexa භාවිතා කරන්න.*\n\n*🎯ඔබේ bot Private  ක්‍රියාත්මක වේ. වෙනස් කිරීමට* _.setvar WORK_TYPE:private_ *විධානය භාවිතා කරන්න.*\n\n🎯public අකාරායෙදි ඔබට ක්‍රියාත්මක වන්නෙ පරිපාලක විධාන පමණි.අන් අයට අනෙකුත් විධාන ක්‍රියාත්මක වේ.\nපරිපාලක විධාන ලැයිස්තුව ලබා ගැනීමට ➤ .admin විධානය භාවිතා කරන්න.\n\n*💠සහය සමූහය*\nhttps://chat.whatsapp.com/GTgqgMTo7FoJ1GqdijshsX\n*💠බොට් අප්ඩේඩ් සහ තොරතුරු*\nhttps://chat.whatsapp.com/LuLTEKm22fp8gv4ltCmKMo\n*💠බොට් අප්ඩේට් සහ තොරතුරු 02*\nhttps://chat.whatsapp.com/LVykTrmNEU98AktU0eBNNq\n💠*Plugging Group*\nhttps://chat.whatsapp.com/JJs2iwfF0VKL3IWrIyr7AT\n\n*🧚‍♀️Thank For Using Queen Alexa💫*', MessageType.text);
                }

            }
        }
        else if (config.WORKTYPE == 'private') {
            if (config.LANG == 'TR' || config.LANG == 'AZ') {

                if (conn.user.jid === '@s.whatsapp.net') {

                    await conn.sendMessage(conn.user.jid, '```🛡️ Blacklist Detected!``` \n ```පරිශීලක:``` \n```හේතුව:``` ', MessageType.text)

                    await new Promise(r => setTimeout(r, 1800));

                    console.log('🛡️ Blacklist Detected 🛡️')
                    await heroku.get(baseURI + '/formation').then(async (formation) => {
                        forID = formation[0].id;
                        await heroku.patch(baseURI + '/formation/' + forID, {
                            body: {
                                quantity: 0
                            }
                        });
                    })
                }
                else {

                await conn.sendMessage(conn.user.jid, '*⦁═Queen 👸 Alexa═⦁ Working As Private*\n\n_🎯 මෙහි command භාවිත නොකරන්න. මෙය ඔබගේ ලොග් අංකයයි._\n_🎯ඔබට ඕනෑම කතාබහක විධාන භාවිත කළ හැකිය :)_\n\n*ඔබේ command list එක ලබාගැනීමට .alexa භාවිතා කරන්න.*\n\n*🎯ඔබේ bot Private  ක්‍රියාත්මක වේ. වෙනස් කිරීමට* _.setvar WORK_TYPE:public_ *විධානය භාවිතා කරන්න.*\n\n*💠සහය සමූහය*\nhttps://chat.whatsapp.com/GTgqgMTo7FoJ1GqdijshsX\n*💠බොට් අප්ඩේඩ් සහ තොරතුරු*\nhttps://chat.whatsapp.com/LuLTEKm22fp8gv4ltCmKMo\n*💠බොට් අප්ඩේට් සහ තොරතුරු 02*\nhttps://chat.whatsapp.com/LVykTrmNEU98AktU0eBNNq\n💠*Plugging Group*\nhttps://chat.whatsapp.com/JJs2iwfF0VKL3IWrIyr7AT\n\n *Thank For Using *', MessageType.text);
                }
            }
            else {

                if (conn.user.jid === '@s.whatsapp.net') {

                    await conn.sendMessage(conn.user.jid, '```🛡️ Blacklist Detected!``` \n```User:```  \n```Reason:``` ', MessageType.text)
   
                    await new Promise(r => setTimeout(r, 1800));

                    console.log('🛡️ Blacklist Detected 🛡️')
                    await heroku.get(baseURI + '/formation').then(async (formation) => {
                        forID = formation[0].id;
                        await heroku.patch(baseURI + '/formation/' + forID, {
                            body: {
                                quantity: 0
                            }
                        });
                    })
                }
                else {

                    await conn.sendMessage(conn.user.jid, '*⦁═Queen 👸 Alexa═⦁ Working As Private*\n\n_🎯 මෙහි command භාවිත නොකරන්න. මෙය ඔබගේ ලොග් අංකයයි._\n_🎯ඔබට ඕනෑම කතාබහක විධාන භාවිත කළ හැකිය :)_\n\n*ඔබේ command list එක ලබාගැනීමට .alexa භාවිතා කරන්න.*\n\n*🎯ඔබේ bot Private  ක්‍රියාත්මක වේ. වෙනස් කිරීමට* _.setvar WORK_TYPE:public_ *විධානය භාවිතා කරන්න.*\n\n*💠සහය සමූහය*\nhttps://chat.whatsapp.com/GTgqgMTo7FoJ1GqdijshsX\n*💠බොට් අප්ඩේඩ් සහ තොරතුරු*\nhttps://chat.whatsapp.com/LuLTEKm22fp8gv4ltCmKMo\n*💠බොට් අප්ඩේට් සහ තොරතුරු 02*\nhttps://chat.whatsapp.com/LVykTrmNEU98AktU0eBNNq\n💠*Plugging Group*\nhttps://chat.whatsapp.com/JJs2iwfF0VKL3IWrIyr7AT\n\n *🧚‍♀️Thank For using Queen Alexa💫*', MessageType.text);
                }
            }
        }
        else {
            return console.log('Wrong WORK_TYPE key! Please use “private” or “public”')
        }
    });

    
    conn.on('message-new', async msg => {
        if (msg.key && msg.key.remoteJid == 'status@broadcast') return;

        if (config.NO_ONLINE) {
            await conn.updatePresence(msg.key.remoteJid, Presence.unavailable);
        }

        if (msg.messageStubType === 32 || msg.messageStubType === 28) {
            // see you message
            var blogo = await axios.get(config.BYE_LOGO, {responseType: 'arraybuffer'})
            var gb = await getMessage(msg.key.remoteJid, 'goodbye')
            
            if (gb !== false) {
                await conn.sendMessage(msg.key.remoteJid, Buffer.from (blogo.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message});
            }
            return;
        } else if (msg.messageStubType === 27 || msg.messageStubType === 31) {
            // Welcome message
            var wlogo = await axios.get(config.WELCOME_LOGO, {responseType: 'arraybuffer'})
            var gb = await getMessage(msg.key.remoteJid)
            
            if (gb !== false) {
                await conn.sendMessage(msg.key.remoteJid, Buffer.from (wlogo.data), MessageType.video, {mimetype: Mimetype.gif, caption: gb.message});
            }
            return;
        }

        events.commands.map(
            async (command) =>  {
                if (msg.message && msg.message.imageMessage && msg.message.imageMessage.caption) {
                    var text_msg = msg.message.imageMessage.caption;
                } else if (msg.message && msg.message.videoMessage && msg.message.videoMessage.caption) {
                    var text_msg = msg.message.videoMessage.caption;
                } else if (msg.message) {
                    var text_msg = msg.message.extendedTextMessage === null ? msg.message.conversation : msg.message.extendedTextMessage.text;
                } else {
                    var text_msg = undefined;
                }

                if ((command.on !== undefined && (command.on === 'image' || command.on === 'photo')
                    && msg.message && msg.message.imageMessage !== null && 
                    (command.pattern === undefined || (command.pattern !== undefined && 
                        command.pattern.test(text_msg)))) || 
                    (command.pattern !== undefined && command.pattern.test(text_msg)) || 
                    (command.on !== undefined && command.on === 'text' && text_msg) ||
                    // Video
                    (command.on !== undefined && (command.on === 'video')
                    && msg.message && msg.message.videoMessage !== null && 
                    (command.pattern === undefined || (command.pattern !== undefined && 
                        command.pattern.test(text_msg))))) {

                    let sendMsg = false;
                    var chat = conn.chats.get(msg.key.remoteJid)
                        
                    if ((config.SUDO !== false && msg.key.fromMe === false && command.fromMe === true &&
                        (msg.participant && config.SUDO.includes(',') ? config.SUDO.split(',').includes(msg.participant.split('@')[0]) : msg.participant.split('@')[0] == config.SUDO || config.SUDO.includes(',') ? config.SUDO.split(',').includes(msg.key.remoteJid.split('@')[0]) : msg.key.remoteJid.split('@')[0] == config.SUDO)
                    ) || command.fromMe === msg.key.fromMe || (command.fromMe === false && !msg.key.fromMe)) {
                        if (command.onlyPinned && chat.pin === undefined) return;
                        if (!command.onlyPm === chat.jid.includes('-')) sendMsg = true;
                        else if (command.onlyGroup === chat.jid.includes('-')) sendMsg = true;
                    }
    
                    if (sendMsg) {
                        if (config.SEND_READ && command.on === undefined) {
                            await conn.chatRead(msg.key.remoteJid);
                        }
                        
                        var match = text_msg.match(command.pattern);
                        
                        if (command.on !== undefined && (command.on === 'image' || command.on === 'photo' )
                        && msg.message.imageMessage !== null) {
                            whats = new Image(conn, msg);
                        } else if (command.on !== undefined && (command.on === 'video' )
                        && msg.message.videoMessage !== null) {
                            whats = new Video(conn, msg);
                        } else {
                            whats = new Message(conn, msg);
                        }
                        if (msg.key.fromMe) {
                            var vers = conn.user.phone.wa_version.split('.')[2]
                            try {
                                if (command.deleteCommand && vers < 12) { 
                                    await whats.delete() 
                                 }
                                 else { 
                                     await command.function(whats, match);
                                 }
                             } catch (err) { await command.function(whats, match) } }

                        try {
                            await command.function(whats, match);
                        } catch (error) {
                            if (config.LANG == 'TR' || config.LANG == 'AZ') {
                                await conn.sendMessage(conn.user.jid, '*-- දෝෂ වාර්තව [Queen 👸 Alexa]--*\n\n' + 
                                    '\n*Bot දෝෂයක් සිදුවී ඇත!\n*'+
                                    '\n_මෙම දෝෂ logs ඔබගේ අංකය හෝ ප්‍රති පාර්ශ්වයේ අංකය අඩංගු විය හැකිය. කරුණාකර එය සමග සැලකිලිමත් වන්න!_\n' +
                                    '\n_උදව් සඳහා ඔබට අපගේ whatsapp support කණ්ඩායමට ලිවිය හැකිය._\n' +
                                    '\n_මෙම පණිවිඩය ඔබගේ අංකයට ගොස් තිබිය යුතුය (සුරකින ලද පණිවිඩ)_\n\n' +
                                    '\n_https://chat.whatsapp.com/hfddyjjhfaqwrybb ඔබට එය මෙම group යොමු කළ හැකිය._\n\n' +
                                    '*සිදු වූ දෝෂය:* ```' + error + '```\n\n'
                                    , MessageType.text, {detectLinks: false});
                            } else {
                                await conn.sendMessage(conn.user.jid, '*-- බොට් වාර්තාව [Queen 👸 Alexa] --*\n' + 
                                    '\n*බොට් නිසි ලෙස ක්‍රියා කරයි.*\n'+
                                    '\n_Message logs ඔබගේ ලොග් අංකයෙ පණිවිඩ පිළිබද සැලකිලිමත් වන්න!_\n' +
                                    '\n_ යම් ගැටලුවක් ඇත්නම් ඔබට අපගේ whatsapp support කණ්ඩායමට ලිවිය හැකිය._\n' +
                                    '\n_(සුරකින ලද පණිවිඩ)_\n\n' +
                                    '\n_අපගේ සහය සමූහය, https://chat.whatsapp.com/GTgqgMTo7FoJ1GqdijshsX\n\n' +
                                    '*Report:* ```' + error + '```\n\n'
                                    , MessageType.text);
                            }
                        }
                    }
                }
            }
        )
    });

    try {
        await conn.connect();
    } catch {
        if (!nodb) {
            console.log(chalk.red.bold('Refreshing your old version string...'))
            conn.loadAuthInfo(Session.deCrypt(config.SESSION)); 
            try {
                await conn.connect();
            } catch {
                return;
            }
        }
    }
}

whatsAsena();
