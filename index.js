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

// --- In-memory storage for anonymous message mappings ---
// Pseudonym storage is no longer needed
const anonymousMessageMap = new Collection();


// --- Pseudonym Configuration and Logic are no longer needed ---
// const availablePseudonyms = [...];
// function getNextAvailablePseudonym() {...}


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

            // Removed 'type' option as it's always anonymous now
            // Removed 'pseudonym' option
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

            // --- Embed Customization for sendanon (always anonymous) ---
            const embedTitle = '<:__:1393759814802215073> voice without a name';
            const embedFooterText = 'Anonymous transmission received.';
            const embedColor = 0x36393F; // Discord default grey color

            const anonymousEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(embedTitle)
                .setDescription(content)
                .setTimestamp()
                .setFooter({ text: embedFooterText + ' \u200B__ANON_MSG__' }); // Keep the hidden identifier

            try {
                const sentMessage = await targetChannel.send({ embeds: [anonymousEmbed] });

                // Always map anonymous messages
                anonymousMessageMap.set(sentMessage.id, interaction.user.id);
                console.log(`Mapped anonymous message ${sentMessage.id} to user ${interaction.user.id} in memory.`);


                await interaction.editReply({
                    content: `Your anonymous message has been sent to #${targetChannel.name}!`,
                    flags: InteractionResponseFlags.Ephemeral,
                });

                console.log(`[${interaction.user.tag}] sent an anonymous message to #${targetChannel.name}`);

            } catch (error) {
                console.error(`Failed to send anonymous message to ${targetChannel.name}:`, error);
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
            // Removed 'replyType' option as it's always anonymous now
            // Removed 'pseudonym' option

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

            // Validation for anonymous messages remains the same
            if (targetMessage.author.id !== client.user.id ||
                !targetMessage.embeds[0] ||
                !targetMessage.embeds[0].footer?.text?.includes('\u200B__ANON_MSG__')) {
                return await interaction.editReply({
                    content: 'That message is not a valid anonymous message from this bot to reply to.',
                    flags: InteractionResponseFlags.Ephemeral,
                });
            }

            // --- Embed Customization for anonreply (always anonymous) ---
            const replyEmbedTitle = '<:__:1393759814802215073> one of many';
            const replyEmbedFooterText = 'A reply from the unknown.';
            const replyEmbedColor = 0x36393F;

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
                    content: `Your anonymous reply has been sent to #${targetChannel.name}!`,
                    flags: InteractionResponseFlags.Ephemeral,
                });

                console.log(`[${interaction.user.tag}] sent an anonymous reply to ${targetMessageId}`);

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