require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

// No longer define themedPseudonymsForDeploy or pseudonymThemeChoices here,
// as the bot will handle pseudonym selection internally from a fixed list.

const commands = [
    {
        name: 'sendanon',
        description: 'Send an anonymous or pseudonymous message.',
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: 'type',
                description: 'Choose message type: anonymous or pseudonymous.',
                required: true,
                choices: [
                    { name: 'Anonymous', value: 'anonymous' },
                    { name: 'Pseudonymous', value: 'pseudonymous' },
                ],
            },
            {
                type: ApplicationCommandOptionType.String,
                name: 'content',
                description: 'The content of your message.',
                required: true,
            },
            {
                type: ApplicationCommandOptionType.String,
                name: 'pseudonym',
                description: 'Specify a pseudonym for pseudonymous messages (optional).', // Updated description
                required: false,
                // REMOVED: choices and related logic
            },
        ],
    },
    {
        name: 'anonreply',
        description: 'Send an anonymous or pseudonymous reply to a message.',
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: 'target_message_id',
                description: 'The ID of the message you are replying to.',
                required: true,
            },
            {
                type: ApplicationCommandOptionType.String,
                name: 'content',
                description: 'The content of your reply.',
                required: true,
            },
            {
                type: ApplicationCommandOptionType.String,
                name: 'type',
                description: 'Choose reply type: anonymous or pseudonymous.',
                required: true,
                choices: [
                    { name: 'Anonymous', value: 'anonymous' },
                    { name: 'Pseudonymous', value: 'pseudonymous' },
                ],
            },
            {
                type: ApplicationCommandOptionType.String,
                name: 'pseudonym',
                description: 'Specify a pseudonym for pseudonymous replies (optional).', // Updated description
                required: false,
                // REMOVED: choices and related logic
            },
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