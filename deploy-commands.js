require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

const commands = [
    {
        name: 'sendanon',
        description: 'Send an anonymous message.',
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: 'content',
                description: 'The content of your anonymous message.',
                required: true,
            },
        ],
    },
    // Removed the entire 'anonreply' command object
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