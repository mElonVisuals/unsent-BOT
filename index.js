require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Initialize the Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const ANONYMOUS_CHANNEL_ID = process.env.ANONYMOUS_CHANNEL_ID; // Import the channel ID

// --- In-memory storage for anonymous message mappings and pseudonym usage ---
const anonymousMessageMap = new Collection();
const usedPseudonyms = new Collection();


// --- Themed Pseudonyms Configuration ---
const themedPseudonyms = {
    "mystical": ["Shadow Whisper", "Silent Oracle", "Moonlit Phantom", "Stardust Soul", "Forest Mystic"],
    "animals": ["Lone Wolf", "Night Owl", "Desert Fox", "Silver Serpent", "Silent Puma"],
    "elements": ["Ember Spark", "Aqua Flow", "Stone Sentinel", "Wind Rider", "Thunder Echo"],
    "random": []
};

Object.values(themedPseudonyms).forEach(arr => {
    if (Array.isArray(arr)) {
        themedPseudonyms.random.push(...arr);
    }
});

function getThemedPseudonym(theme) {
    if (!themedPseudonyms[theme] || !Array.isArray(themedPseudonyms[theme])) {
        return null;
    }

    const cooldownPeriod = 3600000;
    const available = themedPseudonyms[theme].filter(p => !usedPseudonyms.has(p) || (Date.now() - usedPseudonyms.get(p) > cooldownPeriod));
    if (available.length === 0) {
        return null;
    }

    const chosen = available[Math.floor(Math.random() * available.length)];
    usedPseudonyms.set(chosen, Date.now());
    return chosen;
}


// --- Bot Event Listeners ---

client.once('ready', async () => { // Make ready async to fetch channel
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot is ready to receive slash commands and handle interactions.');

    // Validate the ANONYMOUS_CHANNEL_ID on bot startup
    if (!ANONYMOUS_CHANNEL_ID) {
        console.error('ERROR: ANONYMOUS_CHANNEL_ID is not set in .env! Anonymous messages will not be sent.');
        // Optionally, shut down the bot or disable functionality if critical.
        // process.exit(1);
    } else {
        try {
            const channel = await client.channels.fetch(ANONYMOUS_CHANNEL_ID);
            if (!channel || channel.type !== 0) { // 0 is GuildText channel type
                console.error(`ERROR: Configured ANONYMOUS_CHANNEL_ID (${ANONYMOUS_CHANNEL_ID}) is not a valid text channel.`);
                // process.exit(1);
            } else {
                console.log(`Anonymous messages will be sent to #${channel.name} (ID: ${channel.id})`);
            }
        } catch (error) {
            console.error(`ERROR: Could not fetch channel with ID ${ANONYMOUS_CHANNEL_ID}. Check bot permissions and channel ID.`, error);
            // process.exit(1);
        }
    }
});


client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const { commandName } = interaction;

        if (commandName === 'sendanon') {
            await interaction.deferReply({ ephemeral: true });

            const type = interaction.options.getString('type');
            let pseudonym = interaction.options.getString('pseudonym');
            const content = interaction.options.getString('content');

            // --- Fetch the predefined target channel ---
            let targetChannel;
            try {
                targetChannel = await client.channels.fetch(ANONYMOUS_CHANNEL_ID);
                if (!targetChannel || targetChannel.type !== 0) {
                    return await interaction.editReply({
                        content: 'The configured anonymous message channel is invalid or inaccessible. Please contact a bot administrator.',
                        ephemeral: true,
                    });
                }
            } catch (error) {
                console.error(`Error fetching configured channel ID ${ANONYMOUS_CHANNEL_ID}:`, error);
                return await interaction.editReply({
                    content: 'An error occurred while trying to access the anonymous message channel. Please contact a bot administrator.',
                    ephemeral: true,
                });
            }

            // --- Pseudonym Handling Logic (remains the same) ---
            const themeChoices = Object.keys(themedPseudonyms);
            let finalPseudonym = null;

            if (type === 'pseudonymous') {
                if (pseudonym === 'custom_pseudonym') {
                    if (!interaction.options.getString('pseudonym', false) || interaction.options.getString('pseudonym', false) === 'custom_pseudonym') {
                        return await interaction.editReply({
                            content: 'You selected "Custom Pseudonym" but did not provide a name. Please type your desired pseudonym after selecting the custom option, or choose a theme.',
                            ephemeral: true,
                        });
                    }
                    finalPseudonym = pseudonym;
                } else if (pseudonym && themeChoices.includes(pseudonym.toLowerCase())) {
                    const chosenTheme = pseudonym.toLowerCase();
                    const newPseudonym = getThemedPseudonym(chosenTheme);
                    if (newPseudonym) {
                        finalPseudonym = newPseudonym;
                    } else {
                        return await interaction.editReply({
                            content: `All pseudonyms in the "${chosenTheme}" theme are currently in use or were recently used. Please try again later or choose "Custom Pseudonym" and type a name.`,
                            ephemeral: true,
                        });
                    }
                } else if (!pseudonym) {
                    return await interaction.editReply({
                        content: 'You must provide a `pseudonym` for pseudonymous messages. Use a custom name or one of these themes: ' + themeChoices.join(', '),
                        ephemeral: true,
                    });
                } else {
                    finalPseudonym = pseudonym;
                }
            }

            // --- Embed Customization ---
            let embedTitle = '';
            let embedFooterText = '';
            let embedColor = 0x36393F;
            const commonThumbnailUrl = 'https://melonvisuals.me/test/unsent.png';

            if (type === 'anonymous') {
                embedTitle = '🤫 A Whisper in the Dark';
                embedFooterText = 'Anonymous transmission received.';
                embedColor = 0x36393F;
            } else if (type === 'pseudonymous') {
                embedTitle = `🎭 Echo from ${finalPseudonym}`;
                embedFooterText = `Sent from the shadows by ${finalPseudonym}.`;
                embedColor = 0x7289DA;
            }

            const anonymousEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(embedTitle)
                .setDescription(content)
                .setTimestamp()
                .setFooter({ text: embedFooterText + ' \u200B__ANON_MSG__' })
                .setThumbnail(commonThumbnailUrl);

            try {
                const sentMessage = await targetChannel.send({ embeds: [anonymousEmbed] });

                if (type === 'anonymous') {
                    anonymousMessageMap.set(sentMessage.id, interaction.user.id);
                    console.log(`Mapped anonymous message ${sentMessage.id} to user ${interaction.user.id} in memory.`);
                }

                await interaction.editReply({
                    content: `Your ${type} message has been sent to #${targetChannel.name}!`,
                    ephemeral: true,
                });

                console.log(`[${interaction.user.tag}] sent a ${type} message to #${targetChannel.name}`);

            } catch (error) {
                console.error(`Failed to send ${type} message to ${targetChannel.name}:`, error);
                await interaction.editReply({
                    content: 'There was an error sending your message. Please ensure I have permissions to send messages and embed links in the target channel.',
                    ephemeral: true,
                });
            }
        }

        else if (commandName === 'anonreply') {
            await interaction.deferReply({ ephemeral: true });

            const targetMessageId = interaction.options.getString('target_message_id');
            const replyContent = interaction.options.getString('content');
            const replyType = interaction.options.getString('type');
            let pseudonym = interaction.options.getString('pseudonym');

            // --- Fetch the original message from the predefined target channel ---
            let targetChannel;
            try {
                targetChannel = await client.channels.fetch(ANONYMOUS_CHANNEL_ID);
                if (!targetChannel || targetChannel.type !== 0) {
                    return await interaction.editReply({
                        content: 'The configured anonymous message channel is invalid or inaccessible. Please contact a bot administrator.',
                        ephemeral: true,
                    });
                }
            } catch (error) {
                console.error(`Error fetching configured channel ID ${ANONYMOUS_CHANNEL_ID}:`, error);
                return await interaction.editReply({
                    content: 'An error occurred while trying to access the anonymous message channel. Please contact a bot administrator.',
                    ephemeral: true,
                });
            }

            let targetMessage;
            try {
                targetMessage = await targetChannel.messages.fetch(targetMessageId);

            } catch (error) {
                console.error('Error fetching target message for anonymous reply:', error);
                return await interaction.editReply({
                    content: 'Could not find the message with that ID in the designated anonymous channel. Please ensure the message ID is correct.',
                    ephemeral: true,
                });
            }

            if (targetMessage.author.id !== client.user.id ||
                !targetMessage.embeds[0] ||
                !targetMessage.embeds[0].footer?.text?.includes('\u200B__ANON_MSG__')) {
                return await interaction.editReply({
                    content: 'That message is not a valid anonymous message from this bot to reply to.',
                    ephemeral: true,
                });
            }

            // --- Pseudonym Handling Logic (remains the same) ---
            const themeChoices = Object.keys(themedPseudonyms);
            let finalPseudonym = null;

            if (replyType === 'pseudonymous') {
                if (pseudonym === 'custom_pseudonym') {
                    if (!interaction.options.getString('pseudonym', false) || interaction.options.getString('pseudonym', false) === 'custom_pseudonym') {
                        return await interaction.editReply({
                            content: 'You selected "Custom Pseudonym" but did not provide a name. Please type your desired pseudonym after selecting the custom option, or choose a theme.',
                            ephemeral: true,
                        });
                    }
                    finalPseudonym = pseudonym;
                } else if (pseudonym && themeChoices.includes(pseudonym.toLowerCase())) {
                    const chosenTheme = pseudonym.toLowerCase();
                    const newPseudonym = getThemedPseudonym(chosenTheme);
                    if (newPseudonym) {
                        finalPseudonym = newPseudonym;
                    } else {
                        return await interaction.editReply({
                            content: `All pseudonyms in the "${chosenTheme}" theme are currently in use or were recently used for your reply. Please try again later or choose "Custom Pseudonym" and type a name.`,
                            ephemeral: true,
                        });
                    }
                } else if (!pseudonym) {
                    return await interaction.editReply({
                        content: 'You must provide a `pseudonym` for pseudonymous replies. Use a custom name or one of these themes: ' + themeChoices.join(', '),
                        ephemeral: true,
                    });
                } else {
                    finalPseudonym = pseudonym;
                }
            }

            // --- Embed Customization ---
            let replyEmbedTitle = '';
            let replyEmbedFooterText = '';
            let replyEmbedColor = 0x36393F;
            const replyCommonThumbnailUrl = 'https://melonvisuals.me/test/unsent.png';

            if (replyType === 'anonymous') {
                replyEmbedTitle = '🤫 Anonymous Echo';
                replyEmbedFooterText = 'A reply from the unknown.';
                replyEmbedColor = 0x36393F;
            } else if (replyType === 'pseudonymous') {
                replyEmbedTitle = `🎭 ${finalPseudonym}'s Response`;
                replyEmbedFooterText = `A pseudonymous reply from ${finalPseudonym}.`;
                replyEmbedColor = 0x7289DA;
            }

            const replyEmbed = new EmbedBuilder()
                .setColor(replyEmbedColor)
                .setTitle(replyEmbedTitle)
                .setDescription(replyContent)
                .setTimestamp()
                .setFooter({ text: replyEmbedFooterText })
                .addFields(
                    { name: 'Replying to Message', value: `[Click to jump to message](https://discord.com/channels/${targetChannel.guild.id}/${targetChannel.id}/${targetMessageId})`, inline: false }
                )
                .setThumbnail(replyCommonThumbnailUrl);

            try {
                await targetChannel.send({
                    embeds: [replyEmbed],
                    reply: { messageReference: targetMessageId, failIfNotExists: false }
                });

                await interaction.editReply({
                    content: `Your ${replyType} reply has been sent to #${targetChannel.name}!`,
                    ephemeral: true,
                });

                console.log(`[${interaction.user.tag}] sent a ${replyType} reply to ${targetMessageId}`);

            } catch (error) {
                console.error('Failed to send anonymous reply:', error);
                await interaction.editReply({
                    content: 'There was an error sending your anonymous reply. Please try again later. Ensure I have permissions to send messages and embed links in the target channel.',
                    ephemeral: true,
                });
            }
        }
    }
});


client.login(BOT_TOKEN);