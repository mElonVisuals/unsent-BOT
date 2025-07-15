require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

const commands = [
    {
        name: 'sendanon',
        description: 'Send an anonymous message.', // Updated description
        options: [
            // Removed 'type' option as it's now always anonymous
            {
                type: ApplicationCommandOptionType.String,
                name: 'content',
                description: 'The content of your anonymous message.', // Updated description
                required: true,
            },
            // Removed 'pseudonym' option
        ],
    },
    {
        name: 'anonreply',
        description: 'Send an anonymous reply to a message.', // Updated description
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: 'target_message_id',
                description: 'The ID of the anonymous message you are replying to.', // Updated description
                required: true,
            },
            {
                type: ApplicationCommandOptionType.String,
                name: 'content',
                description: 'The content of your anonymous reply.', // Updated description
                required: true,
            },
            // Removed 'type' option as it's now always anonymous
            // Removed 'pseudonym' option
        ],
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        // For guild-specific commands (faster updates during development)
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();