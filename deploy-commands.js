require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

// Define your themed pseudonyms here.
const themedPseudonymsForDeploy = {
    "Mystical": ["Shadow Whisper", "Silent Oracle", "Moonlit Phantom"],
    "Animals": ["Lone Wolf", "Night Owl", "Desert Fox"],
    "Elements": ["Ember Spark", "Aqua Flow", "Stone Sentinel"],
};

// Create choices array for the pseudonym option.
const pseudonymThemeChoices = Object.keys(themedPseudonymsForDeploy).map(theme => ({
    name: `${theme} Theme`,
    value: theme.toLowerCase()
}));
pseudonymThemeChoices.push({ name: 'Custom Pseudonym (type your own)', value: 'custom_pseudonym' });


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
            // REMOVED: { type: ApplicationCommandOptionType.Channel, name: 'channel', description: 'The channel to send the anonymous message to.', required: true, channel_types: [0] },
            {
                type: ApplicationCommandOptionType.String,
                name: 'pseudonym',
                description: 'Your chosen name for pseudonymous messages, or select a theme.',
                required: false,
                choices: pseudonymThemeChoices
            },
        ],
    },
    // REMOVED: The /anonpoll command entirely

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
                description: 'Your chosen name for pseudonymous replies, or select a theme.',
                required: false,
                choices: pseudonymThemeChoices
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