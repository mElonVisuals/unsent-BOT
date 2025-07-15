require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, InteractionResponseFlags } = require('discord.js'); // Removed Collection
const { version: discordVersion } = require('discord.js'); // Import the version


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

// --- In-memory storage for anonymous message mappings (no longer needed for replies) ---
// const anonymousMessageMap = new Collection(); // Removed as it's only for replies

// Define the ephemeral flag numerically for robustness
const EPHEMERAL_FLAG = InteractionResponseFlags?.Ephemeral || 64;


// --- Bot Event Listeners ---

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log(`Discord.js version: ${discordVersion}`);

    if (typeof InteractionResponseFlags === 'undefined' || InteractionResponseFlags.Ephemeral === undefined) {
        console.warn('WARNING: InteractionResponseFlags.Ephemeral is undefined. Using raw numeric flag (64) for ephemeral replies.');
    } else {
        console.log('InteractionResponseFlags.Ephemeral is available and will be used.');
    }


    console.log('Bot is ready to receive slash commands and handle interactions.');

    // --- Set the bot's rich presence here ---
    client.user.setPresence({
        activities: [{
            name: 'old messages again',
            type: ActivityType.Listening
        }],
        status: 'dnd'
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
            await interaction.deferReply({ flags: EPHEMERAL_FLAG });

            const content = interaction.options.getString('content');

            // --- Fetch the predefined target channel ---
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

            // --- Embed Customization for sendanon ---
            const embedTitle = '<:__:1393759814802215073> voice without a name';
            const embedFooterText = 'unsent log captured ::';
            const embedColor = 0x36393F;

            const anonymousEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(embedTitle)
                .setDescription(content)
                .setTimestamp()
                .setFooter({ text: embedFooterText + ' \u200B_one_of_many_' }); // Keep the hidden identifier

            try {
                await targetChannel.send({ embeds: [anonymousEmbed] });

                // Mapping anonymous messages is no longer needed without reply functionality
                // anonymousMessageMap.set(sentMessage.id, interaction.user.id);
                // console.log(`Mapped anonymous message ${sentMessage.id} to user ${interaction.user.id} in memory.`);

                await interaction.editReply({
                    content: `Your anonymous message has been sent to #${targetChannel.name}!`,
                    flags: EPHEMERAL_FLAG,
                });

                console.log(`[${interaction.user.tag}] sent an anonymous message to #${targetChannel.name}`);

            } catch (error) {
                console.error(`Failed to send anonymous message to ${targetChannel.name}:`, error);
                await interaction.editReply({
                    content: 'There was an error sending your message. Please ensure I have permissions to send messages and embed links in the target channel.',
                    flags: EPHEMERAL_FLAG,
                });
            }
        }
        // Removed the entire 'else if (commandName === 'anonreply')' block
    }
});


client.login(BOT_TOKEN);