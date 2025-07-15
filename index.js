require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Collection, ActivityType, InteractionResponseFlags } = require('discord.js');

// Initialize the Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const ANONYMOUS_CHANNEL_ID = process.env.ANONYMOUS_CHANNEL_ID;

// --- In-memory storage for anonymous message mappings and pseudonym usage ---
const anonymousMessageMap = new Collection();
const usedPseudonyms = new Collection();


// --- New Pseudonyms Configuration ---
const availablePseudonyms = [
    "message with no return",
    "heard but not seen",
    "an unknown sender speaks",
    "for someone you almost knew",
    "voice without a name",
    "unsigned and fading",
    "one of many",
    "signal from nowhere",
    "a line left hanging",
    "dropped in the dark"
];

function getNextAvailablePseudonym() {
    const cooldownPeriod = 3600000; // 1 hour cooldown
    const now = Date.now();

    // Filter for pseudonyms not currently in use or whose cooldown has expired
    const available = availablePseudonyms.filter(p => !usedPseudonyms.has(p) || (now - usedPseudonyms.get(p) > cooldownPeriod));

    if (available.length === 0) {
        // If all are currently in use within cooldown, find the one that will be available earliest
        let earliestAvailablePseudonym = null;
        let earliestTime = Infinity;

        for (const p of availablePseudonyms) {
            if (usedPseudonyms.has(p)) {
                const availableAt = usedPseudonyms.get(p) + cooldownPeriod;
                if (availableAt < earliestTime) {
                    earliestTime = availableAt;
                    earliestAvailablePseudonym = p;
                }
            }
        }
        // If no pseudonyms are available AND some exist (shouldn't happen if array is fixed and small),
        // we might just return the one that expires earliest or a default.
        // For simplicity, if all are technically on cooldown, we'll still pick one for now.
        // In a real high-traffic scenario, you might want to wait or inform the user.
        console.warn("All pseudonyms are currently on cooldown, picking the one that expires earliest.");
        return earliestAvailablePseudonym || availablePseudonyms[Math.floor(Math.random() * availablePseudonyms.length)];
    }

    const chosen = available[Math.floor(Math.random() * available.length)];
    usedPseudonyms.set(chosen, now); // Mark as used with current timestamp
    return chosen;
}


// --- Bot Event Listeners ---

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Bot is ready to receive slash commands and handle interactions.');

    // --- Set the bot's rich presence here ---
    client.user.setPresence({
        activities: [{
            name: 'Filling the void with messages',
            type: ActivityType.Playing
        }],
        status: 'online'
    });
    console.log('Bot presence set to "Playing: Filling the void with messages".');
    // --- End rich presence setting ---


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
});


client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const { commandName } = interaction;

        if (commandName === 'sendanon') {
            await interaction.deferReply({ flags: InteractionResponseFlags.Ephemeral });

            const type = interaction.options.getString('type');
            let userProvidedPseudonym = interaction.options.getString('pseudonym'); // Renamed to clarify
            const content = interaction.options.getString('content');

            // --- Fetch the predefined target channel ---
            let targetChannel;
            try {
                targetChannel = await client.channels.fetch(ANONYMOUS_CHANNEL_ID);
                if (!targetChannel || targetChannel.type !== 0) {
                    return await interaction.editReply({
                        content: 'The configured anonymous message channel is invalid or inaccessible. Please contact a bot administrator.',
                        flags: InteractionResponseFlags.Ephemeral,
                    });
                }
            } catch (error) {
                console.error(`Error fetching configured channel ID ${ANONYMOUS_CHANNEL_ID}:`, error);
                return await interaction.editReply({
                    content: 'An error occurred while trying to access the anonymous message channel. Please contact a bot administrator.',
                    flags: InteractionResponseFlags.Ephemeral,
                });
            }

            // --- Pseudonym Handling Logic ---
            let finalPseudonym = null;

            if (type === 'pseudonymous') {
                if (userProvidedPseudonym) {
                    finalPseudonym = userProvidedPseudonym; // Use user-provided pseudonym if given
                } else {
                    finalPseudonym = getNextAvailablePseudonym(); // Get one from the list
                    if (!finalPseudonym) {
                        return await interaction.editReply({
                            content: 'Could not assign a pseudonym. All pseudonyms are currently in use or on cooldown. Please try again later.',
                            flags: InteractionResponseFlags.Ephemeral,
                        });
                    }
                }
            }

            // --- Embed Customization for sendanon ---
            let embedTitle = '';
            let embedFooterText = '';
            let embedColor = 0x36393F;

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
                .setFooter({ text: embedFooterText + ' \u200B__ANON_MSG__' });

            try {
                const sentMessage = await targetChannel.send({ embeds: [anonymousEmbed] });

                if (type === 'anonymous') {
                    anonymousMessageMap.set(sentMessage.id, interaction.user.id);
                    console.log(`Mapped anonymous message ${sentMessage.id} to user ${interaction.user.id} in memory.`);
                }

                await interaction.editReply({
                    content: `Your ${type} message has been sent to #${targetChannel.name}!`,
                    flags: InteractionResponseFlags.Ephemeral,
                });

                console.log(`[${interaction.user.tag}] sent a ${type} message to #${targetChannel.name}`);

            } catch (error) {
                console.error(`Failed to send ${type} message to ${targetChannel.name}:`, error);
                await interaction.editReply({
                    content: 'There was an error sending your message. Please ensure I have permissions to send messages and embed links in the target channel.',
                    flags: InteractionResponseFlags.Ephemeral,
                });
            }
        }

        else if (commandName === 'anonreply') {
            await interaction.deferReply({ flags: InteractionResponseFlags.Ephemeral });

            const targetMessageId = interaction.options.getString('target_message_id');
            const replyContent = interaction.options.getString('content');
            const replyType = interaction.options.getString('type');
            let userProvidedPseudonym = interaction.options.getString('pseudonym'); // Renamed to clarify

            // --- Fetch the original message from the predefined target channel ---
            let targetChannel;
            try {
                targetChannel = await client.channels.fetch(ANONYMOUS_CHANNEL_ID);
                if (!targetChannel || targetChannel.type !== 0) {
                    return await interaction.editReply({
                        content: 'The configured anonymous message channel is invalid or inaccessible. Please contact a bot administrator.',
                        flags: InteractionResponseFlags.Ephemeral,
                    });
                }
            } catch (error) {
                console.error(`Error fetching configured channel ID ${ANONYMOUS_CHANNEL_ID}:`, error);
                return await interaction.editReply({
                    content: 'An error occurred while trying to access the anonymous message channel. Please contact a bot administrator.',
                    flags: InteractionResponseFlags.Ephemeral,
                });
            }

            let targetMessage;
            try {
                targetMessage = await targetChannel.messages.fetch(targetMessageId);

            } catch (error) {
                console.error('Error fetching target message for anonymous reply:', error);
                return await interaction.editReply({
                    content: 'Could not find the message with that ID in the designated anonymous channel. Please ensure the message ID is correct.',
                    flags: InteractionResponseFlags.Ephemeral,
                });
            }

            if (targetMessage.author.id !== client.user.id ||
                !targetMessage.embeds[0] ||
                !targetMessage.embeds[0].footer?.text?.includes('\u200B__ANON_MSG__')) {
                return await interaction.editReply({
                    content: 'That message is not a valid anonymous message from this bot to reply to.',
                    flags: InteractionResponseFlags.Ephemeral,
                });
            }

            // --- Pseudonym Handling Logic ---
            let finalPseudonym = null;

            if (replyType === 'pseudonymous') {
                if (userProvidedPseudonym) {
                    finalPseudonym = userProvidedPseudonym; // Use user-provided pseudonym if given
                } else {
                    finalPseudonym = getNextAvailablePseudonym(); // Get one from the list
                    if (!finalPseudonym) {
                        return await interaction.editReply({
                            content: 'Could not assign a pseudonym for your reply. All pseudonyms are currently in use or on cooldown. Please try again later.',
                            flags: InteractionResponseFlags.Ephemeral,
                        });
                    }
                }
            }

            // --- Embed Customization for anonreply ---
            let replyEmbedTitle = '';
            let replyEmbedFooterText = '';
            let replyEmbedColor = 0x36393F;

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
                );

            try {
                await targetChannel.send({
                    embeds: [replyEmbed],
                    reply: { messageReference: targetMessageId, failIfNotExists: false }
                });

                await interaction.editReply({
                    content: `Your ${replyType} reply has been sent to #${targetChannel.name}!`,
                    flags: InteractionResponseFlags.Ephemeral,
                });

                console.log(`[${interaction.user.tag}] sent a ${replyType} reply to ${targetMessageId}`);

            } catch (error) {
                console.error('Failed to send anonymous reply:', error);
                await interaction.editReply({
                    content: 'There was an error sending your anonymous reply. Please try again later. Ensure I have permissions to send messages and embed links in the target channel.',
                    flags: InteractionResponseFlags.Ephemeral,
                });
            }
        }
    }
});


client.login(BOT_TOKEN);