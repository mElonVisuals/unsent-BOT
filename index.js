require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, InteractionResponseFlags, PermissionsBitField } = require('discord.js');
const { version: discordVersion } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
console.log('BOT_TOKEN:', BOT_TOKEN ? '[REDACTED]' : 'No token found or empty!');
const ANONYMOUS_CHANNEL_ID = process.env.ANONYMOUS_CHANNEL_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID; // Added new environment variable


const EPHEMERAL_FLAG = InteractionResponseFlags?.Ephemeral || 64;

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log(`Discord.js version: ${discordVersion}`);

    if (typeof InteractionResponseFlags === 'undefined' || InteractionResponseFlags.Ephemeral === undefined) {
        console.warn('WARNING: InteractionResponseFlags.Ephemeral is undefined. Using raw numeric flag (64) for ephemeral replies.');
    } else {
        console.log('InteractionResponseFlags.Ephemeral is available and will be used.');
    }

    console.log('Bot is ready to receive slash commands and handle interactions.');

    client.user.setPresence({
        activities: [{
            name: 'Filling the void with messages',
            type: ActivityType.Playing
        }],
        status: 'online'
    });
    console.log('Bot presence set to "Playing: Filling the void with messages".');

    // Validate the ANONYMOUS_CHANNEL_ID on bot startup
    if (!ANONYMOUS_CHANNEL_ID) {
        console.error('ERROR: ANONYMOUS_CHANNEL_ID is not set in .env! Anonymous messages will not be sent.');
    } else {
        try {
            const channel = await client.channels.fetch(ANONYMOUS_CHANNEL_ID);
            if (!channel || channel.type !== 0) {
                console.error(`ERROR: Configured ANONYMOUS_CHANNEL_ID (${ANONYMOUS_CHANNEL_ID}) is not a valid text channel.`);
            } else {
                console.log(`Anonymous messages will be sent to #${channel.name} (ID: ${channel.id})`);
            }
        } catch (error) {
            console.error(`ERROR: Could not fetch channel with ID ${ANONYMOUS_CHANNEL_ID}. Check bot permissions and channel ID.`, error);
        }
    }
    
    // Validate the LOG_CHANNEL_ID on bot startup
    if (!LOG_CHANNEL_ID) {
        console.warn('WARNING: LOG_CHANNEL_ID is not set in .env. Logs will not be sent.');
    } else {
        try {
            const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
            if (!logChannel || logChannel.type !== 0) {
                console.error(`ERROR: Configured LOG_CHANNEL_ID (${LOG_CHANNEL_ID}) is not a valid text channel.`);
            } else {
                console.log(`Logs will be sent to #${logChannel.name} (ID: ${logChannel.id})`);
            }
        } catch (error) {
            console.error(`ERROR: Could not fetch channel with ID ${LOG_CHANNEL_ID}. Check bot permissions and channel ID.`, error);
        }
    }
});


client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'sendanon') {
        return; // Only process the 'sendanon' command.
    }

    await interaction.deferReply({ flags: EPHEMERAL_FLAG });

    const content = interaction.options.getString('content');
    const sender = interaction.user;

    let targetChannel;
    try {
        targetChannel = await client.channels.fetch(ANONYMOUS_CHANNEL_ID);
        if (!targetChannel || targetChannel.type !== 0) {
            return await interaction.editReply({
                content: 'The configured anonymous message channel is invalid or inaccessible. Please contact a bot administrator.',
                flags: EPHEMERAL_FLAG,
            });
        }
    } catch (error) {
        console.error(`Error fetching configured channel ID ${ANONYMOUS_CHANNEL_ID}:`, error);
        return await interaction.editReply({
            content: 'An error occurred while trying to access the anonymous message channel. Please contact a bot administrator.',
            flags: EPHEMERAL_FLAG,
        });
    }

    const anonymousEmbed = new EmbedBuilder()
        .setColor(0x36393F)
        .setTitle('🤫 A Whisper in the Dark')
        .setDescription(content)
        .setTimestamp()
        .setFooter({ text: 'Anonymous transmission received' });

    try {
        const sentMessage = await targetChannel.send({ embeds: [anonymousEmbed] });

        // --- AUTOMATIC LOGGING ---
        if (LOG_CHANNEL_ID) {
            const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
            if (logChannel && logChannel.type === 0) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🚨 New Anonymous Message Sent')
                    .setDescription(`**Anonymous Message:** [Jump to Message](https://discord.com/channels/${interaction.guildId}/${ANONYMOUS_CHANNEL_ID}/${sentMessage.id})`)
                    .addFields(
                        { name: 'Sender User Tag', value: `${sender.tag}`, inline: true },
                        { name: 'Sender User ID', value: `${sender.id}`, inline: true },
                        { name: 'Sent At', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
                    )
                    .setTimestamp();
                
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
        // --- END AUTOMATIC LOGGING ---

        await interaction.editReply({
            content: `Your anonymous message has been sent to #${targetChannel.name}!`,
            flags: EPHEMERAL_FLAG,
        });

        console.log(`[${sender.tag}] sent an anonymous message to #${targetChannel.name}`);

    } catch (error) {
        console.error(`Failed to send anonymous message to ${targetChannel.name}:`, error);
        await interaction.editReply({
            content: 'There was an error sending your message. Please ensure I have permissions to send messages and embed links in the target channel.',
            flags: EPHEMERAL_FLAG,
        });
    }
});

client.login(BOT_TOKEN);
