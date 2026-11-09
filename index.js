const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActivityType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Error handling to prevent crashes
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err);
});

// Lightweight Health-Check HTTP server for 24/7 Cloud Hosting (Render / Railway / UptimeRobot)
const PORT = process.env.PORT || 3000;
const healthServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      status: 'online',
      project: 'EvoDino Discord Bot',
      uptime: `${Math.floor(process.uptime())}s`,
      timestamp: new Date().toISOString(),
    })
  );
});
healthServer.listen(PORT, () => {
  console.log(`🌐 Health-check server active on port ${PORT} (Ready for 24/7 cloud pinging)`);
});

const configPath = path.join(__dirname, 'config.json');
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {
      welcomeChannelId: '1561350729875067054',
      rulesChannelId: '1561351213428252782',
      rolesChannelId: '1561351770461179927',
      autoRoleId: '1569376728013348964',
      euRoleId: '1561858108286836906',
      ticketCategoryId: '1561350687160533102',
      supportDeskChannelId: '1561350984884682806',
      supportGuideChannelId: '1561351453132591106',
      ticketRoleId: '1561826282444947517',
    };
  }
}
function saveConfig(data) {
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
}

// Slash Commands Definition (100% English)
const commands = [
  new SlashCommandBuilder()
    .setName('testwelcome')
    .setDescription('Send a test welcome card to the configured welcome channel (Admins)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Set the welcome & invite-tracking channel (Admins)')
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Select the text channel for welcome messages').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('send-roles')
    .setDescription('Send the interactive self-roles selection panel (Admins)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('send-tickets')
    .setDescription('Deploy the interactive Support Desk & Ticket panels (Admins)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close and archive the current support ticket'),

  new SlashCommandBuilder()
    .setName('setautorole')
    .setDescription('Set the default role automatically assigned to new members')
    .addRoleOption((opt) =>
      opt.setName('role').setDescription('Select the auto-role').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('setstatus')
    .setDescription('Change the custom activity status of the bot (Admins)')
    .addStringOption((opt) =>
      opt.setName('text').setDescription('The new status text').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Check invite statistics for yourself or another member')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Select member (optional)').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot latency and Discord API heartbeat'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available bot commands and features'),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('View server statistics and information'),

  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('View profile details of a member')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Select member (optional)').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete messages from this channel (Moderation)')
    .addIntegerOption((opt) =>
      opt
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server (Moderation)')
    .addUserOption((opt) =>
      opt.setName('target').setDescription('Member to kick').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for kick').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
];

// Aesthetic Welcome Card Generator
function createWelcomePayload(member, inviter = null, inviteUses = null) {
  const config = loadConfig();
  const rulesChannelId = config.rulesChannelId || '1561351213428252782';
  const rolesChannelId = config.rolesChannelId || '1561351770461179927';
  const bannerFile = path.join(__dirname, 'evodino_banner.png');
  const hasBanner = fs.existsSync(bannerFile);

  const embed = new EmbedBuilder()
    .setColor('#00FFE0')
    .setTitle(`🦖 WELCOME TO ${member.guild.name.toUpperCase()}!`)
    .setDescription(
      `Hey ${member}, welcome to **${member.guild.name}**! 👋\n\n` +
      `📜 **Server Rules:** Don't forget to read the rules in <#${rulesChannelId}>!\n` +
      `🎭 **Get Roles:** Pick your custom roles in <#${rolesChannelId}>!\n` +
      `💬 **Chat:** Introduce yourself and say hi in <#1561350969307041976>!\n\n` +
      `*We're thrilled to have you here. Enjoy your stay and have fun!* ✨`
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
    .addFields(
      {
        name: '👤 Member',
        value: `${member.user.tag} (${member})`,
        inline: true,
      },
      {
        name: '📨 Invited By',
        value: inviter ? `${inviter.tag} (<@${inviter.id}>)` : 'Direct / Vanity Link',
        inline: true,
      },
      {
        name: '📊 Inviter Stats',
        value: inviteUses !== null ? `**${inviteUses}** invites` : 'N/A',
        inline: true,
      },
      {
        name: '👥 Server Member',
        value: `#**${member.guild.memberCount}**`,
        inline: true,
      },
      {
        name: '📅 Account Created',
        value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
        inline: true,
      },
      {
        name: '📥 Joined Server',
        value: `<t:${Math.floor((member.joinedTimestamp || Date.now()) / 1000)}:f>`,
        inline: true,
      }
    )
    .setFooter({
      text: `User ID: ${member.id} • ${member.guild.name}`,
      iconURL: member.guild.iconURL({ dynamic: true }) || undefined,
    })
    .setTimestamp();

  const files = [];
  if (hasBanner) {
    files.push(new AttachmentBuilder(bannerFile, { name: 'evodino_banner.png' }));
    embed.setImage('attachment://evodino_banner.png');
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_read_rules')
      .setLabel('Read Server Rules')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📜'),
    new ButtonBuilder()
      .setCustomId('btn_get_roles')
      .setLabel('Get Roles')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎭')
  );

  return {
    content: `👋 Welcome to the server, ${member}! Don't forget to check <#${rulesChannelId}>!`,
    embeds: [embed],
    components: [row],
    files,
  };
}

// Self-Assignable Roles Panel Generator
function createRolesPanel(guild) {
  const config = loadConfig();
  const euRole = guild.roles.cache.get(config.euRoleId);
  const freshRole = guild.roles.cache.get(config.autoRoleId);

  const embed = new EmbedBuilder()
    .setColor('#00FFE0')
    .setTitle(`🏷️ ${guild.name.toUpperCase()} • SELF ROLES`)
    .setDescription(
      `Welcome to **${guild.name}**! Click the buttons below to customize your roles:\n\n` +
      `🔹 **EU Server Role:** ${euRole ? `<@&${euRole.id}>` : '`Eu1 Status`'}\n` +
      `Click the button below to toggle the EU server status role on or off anytime.\n\n` +
      `🔹 **Member Role:** ${freshRole ? `<@&${freshRole.id}>` : '`fresh`'}\n` +
      `Automatically assigned upon joining. Click to verify or re-claim.`
    )
    .setFooter({ text: 'Click a button to toggle (add/remove) the role' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('toggle_eu_role')
      .setLabel(euRole ? euRole.name : 'Eu1 Status 🤖')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🤖'),
    new ButtonBuilder()
      .setCustomId('claim_fresh_role')
      .setLabel(freshRole ? freshRole.name : 'fresh 🐣')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🐣')
  );

  return { embeds: [embed], components: [row] };
}

// Support Desk Ticket Panel Generator (Main Channel 1561350984884682806)
function createSupportDeskPanel(guild) {
  const config = loadConfig();
  const ticketRole = config.ticketRoleId ? `<@&${config.ticketRoleId}>` : 'Staff';

  const embed = new EmbedBuilder()
    .setColor('#00FFE0')
    .setTitle(`🎟️ ${guild.name.toUpperCase()} • SUPPORT DESK`)
    .setDescription(
      `Need assistance from our team? Click a category button below to open a private ticket.\n\n` +
      `🦖 **Player Report:** Report mix-packing, combat logging, toxic conduct, or rule breaks.\n` +
      `🦴 **Dino Stuck:** Fallen through the map, stuck in rocks, or need teleport unstuck.\n` +
      `🧬 **Dino Restore:** Dinosaur lost due to server crash, glitch, or confirmed rule break.\n` +
      `❓ **General Support:** General server questions, discord assistance, or inquiries.\n\n` +
      `🔒 *All tickets are private channels restricted exclusively to you and ${ticketRole}.*`
    )
    .setFooter({ text: 'EvoDino Ticket System • Click to open a private channel' })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_rulebreak')
      .setLabel('Player Report')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🦖'),
    new ButtonBuilder()
      .setCustomId('ticket_stuck')
      .setLabel('Dino Stuck')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🦴'),
    new ButtonBuilder()
      .setCustomId('ticket_restore')
      .setLabel('Dino Restore')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🧬'),
    new ButtonBuilder()
      .setCustomId('ticket_general')
      .setLabel('General Support')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❓')
  );

  return { embeds: [embed], components: [row1] };
}

// Support Guide & VIP Desk Panel Generator (Guide Channel 1561351453132591106)
function createSupportGuidePanel(guild) {
  const config = loadConfig();
  const ticketRole = config.ticketRoleId ? `<@&${config.ticketRoleId}>` : 'Staff';

  const embed = new EmbedBuilder()
    .setColor('#00FFE0')
    .setTitle(`📚 ${guild.name.toUpperCase()} • SUPPORT GUIDE & VIP DESK`)
    .setDescription(
      `Welcome to the **EvoDino Support Guide**! Please read the guidelines before opening a ticket.\n\n` +
      `📜 **Ticket Rules & Guidelines:**\n` +
      `1. **Evidence is Required:** For player reports, you MUST provide video clips (YouTube/Streamable/Medal) or screenshots with coordinates.\n` +
      `2. **Stay Patient:** Do not tag individual admins. Staff with ${ticketRole} will be notified automatically.\n` +
      `3. **One Issue Per Ticket:** Do not duplicate tickets for the same issue.\n\n` +
      `💎 **VIP Perks & Bug Reporting:**\n` +
      `Click the buttons below to claim your VIP rank perks, grow deliveries, or submit technical bugs.`
    )
    .setFooter({ text: 'EvoDino Ticket System • VIP & Technical Support' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_vip')
      .setLabel('VIP Perks & Grows')
      .setStyle(ButtonStyle.Success)
      .setEmoji('💎'),
    new ButtonBuilder()
      .setCustomId('ticket_bug')
      .setLabel('Bug / Glitch Report')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🐛'),
    new ButtonBuilder()
      .setCustomId('btn_read_rules')
      .setLabel('Read Server Rules')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📜')
  );

  return { embeds: [embed], components: [row] };
}

// Ticket Category Details Map
const TICKET_TYPES = {
  ticket_rulebreak: {
    prefix: 'report',
    title: 'Player Report / Rule Break',
    color: '#FF4757',
  },
  ticket_stuck: {
    prefix: 'stuck',
    title: 'Dino Stuck / Teleport',
    color: '#3742FA',
  },
  ticket_restore: {
    prefix: 'restore',
    title: 'Dino Restore / Revive Request',
    color: '#2ED573',
  },
  ticket_general: {
    prefix: 'support',
    title: 'General Support & Inquiries',
    color: '#00FFE0',
  },
  ticket_vip: {
    prefix: 'vip',
    title: 'VIP Perks & Grows Claim',
    color: '#FFA502',
  },
  ticket_bug: {
    prefix: 'bug',
    title: 'Technical & Bug Report',
    color: '#70A1FF',
  },
};

function initBot(withMembersIntent = true) {
  const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
  ];
  if (withMembersIntent) {
    intents.push(GatewayIntentBits.GuildMembers);
  }

  const client = new Client({ intents });
  const invitesCache = new Map();

  client.on('error', (err) => {
    console.error('❌ Discord Client Error:', err.message);
  });

  client.once('clientReady', async () => {
    console.log(`=======================================`);
    console.log(`✅ Bot successfully online: ${client.user.tag}`);
    console.log(`🆔 ID: ${client.user.id}`);
    console.log(`🌐 Servers: ${client.guilds.cache.size}`);
    client.guilds.cache.forEach((g) => console.log(`📌 In Guild: [${g.name}] (ID: ${g.id})`));
    console.log(`⚡ Members Intent: ${withMembersIntent ? 'Enabled ✅' : 'Requires Developer Portal toggle ⚠️'}`);
    console.log(`=======================================`);

    client.user.setActivity('welcome to evodino', { type: ActivityType.Custom });

    // Cache guild invites for tracking
    for (const guild of client.guilds.cache.values()) {
      try {
        const invites = await guild.invites.fetch();
        invitesCache.set(guild.id, new Map(invites.map((inv) => [inv.code, inv.uses])));
      } catch (e) {
        // Needs Manage Server permission for invite cache
      }
    }

    try {
      console.log('⏳ Registering global slash commands...');
      await client.application.commands.set(commands);
      console.log('✅ Slash commands successfully registered!');
    } catch (err) {
      console.error('❌ Error registering slash commands:', err.message);
    }
  });

  client.on('inviteCreate', async (invite) => {
    const current = invitesCache.get(invite.guild.id) || new Map();
    current.set(invite.code, invite.uses);
    invitesCache.set(invite.guild.id, current);
  });

  client.on('inviteDelete', async (invite) => {
    const current = invitesCache.get(invite.guild.id);
    if (current) current.delete(invite.code);
  });

  // Member Join Event (Auto-Role & Welcome Announcement)
  client.on('guildMemberAdd', async (member) => {
    const config = loadConfig();

    // 1. Assign default Auto Role (fresh)
    if (config.autoRoleId) {
      try {
        await member.roles.add(config.autoRoleId);
        console.log(`✅ Auto-role assigned to member: ${member.user.tag}`);
      } catch (roleErr) {
        console.error('❌ Failed to assign auto-role (Make sure bot role is above target role):', roleErr.message);
      }
    }

    // 2. Announce in Welcome Channel
    const channelId = config.welcomeChannelId;
    if (!channelId) {
      console.warn('⚠️ No welcomeChannelId configured.');
      return;
    }

    const welcomeChannel =
      member.guild.channels.cache.get(channelId) ||
      (await client.channels.fetch(channelId).catch((e) => {
        console.error('Failed to fetch welcome channel:', e.message);
        return null;
      }));

    if (!welcomeChannel) {
      console.warn(`⚠️ Welcome channel with ID ${channelId} not found.`);
      return;
    }

    console.log(`📢 Announcing welcome for ${member.user.tag} in #${welcomeChannel.name} (${channelId})`);

    const cached = invitesCache.get(member.guild.id) || new Map();
    let inviter = null;
    let inviteUses = null;

    try {
      const newInvites = await member.guild.invites.fetch();
      const used = newInvites.find((inv) => {
        const prev = cached.get(inv.code) || 0;
        return inv.uses > prev;
      });

      if (used) {
        inviter = used.inviter;
        inviteUses = used.uses;
      }
      invitesCache.set(member.guild.id, new Map(newInvites.map((inv) => [inv.code, inv.uses])));
    } catch (err) {
      console.warn('Unable to determine invite code:', err.message);
    }

    const payload = createWelcomePayload(member, inviter, inviteUses);
    welcomeChannel.send(payload).catch(async (err) => {
      console.warn('Embed/file send failed, falling back to text:', err.message);
      await welcomeChannel
        .send(
          `🎉 **Welcome to ${member.guild.name}, ${member}!**\n` +
          `📨 Invited by: ${inviter ? `${inviter}` : 'Direct Link'}\n` +
          `👥 Member #${member.guild.memberCount}`
        )
        .catch((e) => console.error('Fallback text message also failed:', e.message));
    });
  });

  // Server Boost Event Handler (Auto custom booster role & announcement)
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const config = loadConfig();
    const wasBoosting = Boolean(oldMember.premiumSince);
    const isBoosting = Boolean(newMember.premiumSince);

    // Member just boosted the server!
    if (!wasBoosting && isBoosting) {
      console.log(`🚀 Boost detected from ${newMember.user.tag}!`);

      // Assign custom booster role (1561857458920628264)
      const customBoosterRole = config.boosterRoleId || '1561857458920628264';
      if (customBoosterRole && newMember.guild.roles.cache.has(customBoosterRole)) {
        await newMember.roles.add(customBoosterRole).catch((e) => console.error('Booster role add failed:', e.message));
      }

      // Send Celebration Announcement in Welcome Channel
      const welcomeChId = config.welcomeChannelId || '1561350729875067054';
      const welcomeCh = await client.channels.fetch(welcomeChId).catch(() => null);
      if (welcomeCh && welcomeCh.isTextBased()) {
        const boostEmbed = new EmbedBuilder()
          .setColor('#FF73FA')
          .setTitle('🚀 NEW SERVER BOOST!')
          .setDescription(
            `A massive thank you to ${newMember} for boosting **${newMember.guild.name}**! 🎉\n\n` +
            `💎 **Booster Perks Unlocked:**\n` +
            `• Access to exclusive booster perks & badge\n` +
            `• Custom booster role & status\n` +
            `• Helping upgrade audio quality & server bandwidth for everyone!\n\n` +
            `*Thank you for supporting EvoDino!* 🦖✨`
          )
          .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true, size: 512 }))
          .setFooter({ text: 'EvoDino Nitro Boosters' })
          .setTimestamp();

        await welcomeCh.send({ embeds: [boostEmbed] }).catch(() => {});
      }
    }

    // Member stopped boosting
    if (wasBoosting && !isBoosting) {
      console.log(`📉 Boost expired for ${newMember.user.tag}`);
      const customBoosterRole = config.boosterRoleId || '1561857458920628264';
      if (customBoosterRole && newMember.roles.cache.has(customBoosterRole)) {
        await newMember.roles.remove(customBoosterRole).catch(() => {});
      }
    }
  });

  // Interaction Handler (Buttons, Modals, Slash Commands)
  client.on('interactionCreate', async (interaction) => {
    const config = loadConfig();

    // 🔘 Button Interactions
    if (interaction.isButton()) {
      const member = interaction.member;

      // Welcome buttons
      if (interaction.customId === 'btn_read_rules') {
        const rulesId = config.rulesChannelId || '1561351213428252782';
        return interaction.reply({
          content: `📜 **Server Rules:** Please make sure to read and follow all rules in <#${rulesId}>!`,
          flags: 64,
        });
      }

      if (interaction.customId === 'btn_get_roles') {
        const rolesId = config.rolesChannelId || '1561351770461179927';
        return interaction.reply({
          content: `🎭 **Server Roles:** Head over to <#${rolesId}> to pick your roles and customize your profile!`,
          flags: 64,
        });
      }

      // Role Panel toggles
      if (interaction.customId === 'toggle_eu_role') {
        const roleId = config.euRoleId;
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {
          return interaction.reply({ content: '❌ EU Role not found in server.', flags: 64 });
        }

        try {
          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            return interaction.reply({
              content: `🔴 **Removed role:** ${role.name}`,
              flags: 64,
            });
          } else {
            await member.roles.add(roleId);
            return interaction.reply({
              content: `🟢 **Granted role:** ${role.name}!`,
              flags: 64,
            });
          }
        } catch (err) {
          return interaction.reply({
            content: `❌ **Cannot modify role:** Ensure the bot role (\`${client.user.username}\`) is placed ABOVE (\`${role.name}\`) in Server Settings ➔ Roles.`,
            flags: 64,
          });
        }
      }

      if (interaction.customId === 'claim_fresh_role') {
        const roleId = config.autoRoleId;
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {
          return interaction.reply({ content: '❌ Member role not found in server.', flags: 64 });
        }

        try {
          if (member.roles.cache.has(roleId)) {
            return interaction.reply({
              content: `ℹ️ You already have the **${role.name}** role.`,
              flags: 64,
            });
          } else {
            await member.roles.add(roleId);
            return interaction.reply({
              content: `🐣 **Granted role:** ${role.name}! Welcome aboard.`,
              flags: 64,
            });
          }
        } catch (err) {
          return interaction.reply({
            content: `❌ **Cannot modify role:** Ensure the bot role is placed above ${role.name} in Server Settings ➔ Roles.`,
            flags: 64,
          });
        }
      }

      // 🎟️ TICKET BUTTON CLICK -> Show Interactive Modal Pop-up!
      if (TICKET_TYPES[interaction.customId]) {
        const ticketInfo = TICKET_TYPES[interaction.customId];
        const categoryId = config.ticketCategoryId || '1561350687160533102';

        // Check if user already has an active ticket channel in this category
        const cleanName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
        const existingChannel = interaction.guild.channels.cache.find(
          (c) => c.parentId === categoryId && c.name.includes(cleanName)
        );

        if (existingChannel) {
          return interaction.reply({
            content: `⚠️ You already have an open ticket channel: <#${existingChannel.id}>. Please resolve it before opening another!`,
            flags: 64,
          });
        }

        const modal = new ModalBuilder()
          .setCustomId(`modal_${interaction.customId}`)
          .setTitle(`${ticketInfo.title}`.slice(0, 45));

        const steamInput = new TextInputBuilder()
          .setCustomId('steam_id')
          .setLabel('Your Steam ID (64-bit)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('76561198012345678')
          .setRequired(true);

        const serverInput = new TextInputBuilder()
          .setCustomId('server_name')
          .setLabel('Game Server')
          .setStyle(TextInputStyle.Short)
          .setValue('EU1')
          .setPlaceholder('EU1')
          .setRequired(true);

        if (interaction.customId === 'ticket_rulebreak') {
          const reportedPlayerInput = new TextInputBuilder()
            .setCustomId('reported_player')
            .setLabel('Player to Report (Name / Steam ID)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Suspect player name or Steam ID')
            .setRequired(true);

          const cheatTypeInput = new TextInputBuilder()
            .setCustomId('cheat_type')
            .setLabel('Cheat Type / Rule Break')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g. Mix-packing, Speedhack, Toxic chat, Combat log')
            .setRequired(true);

          const descInput = new TextInputBuilder()
            .setCustomId('problem_description')
            .setLabel('Describe What Happened & Proof Links')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Describe the incident, coordinates, and upload replay/video link (YouTube/Medal)...')
            .setRequired(true)
            .setMaxLength(1000);

          modal.addComponents(
            new ActionRowBuilder().addComponents(steamInput),
            new ActionRowBuilder().addComponents(serverInput),
            new ActionRowBuilder().addComponents(reportedPlayerInput),
            new ActionRowBuilder().addComponents(cheatTypeInput),
            new ActionRowBuilder().addComponents(descInput)
          );
        } else {
          const descInput = new TextInputBuilder()
            .setCustomId('problem_description')
            .setLabel('Problem Description & Details')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Describe your issue, coordinates, dino species, or proof links...')
            .setRequired(true)
            .setMaxLength(1000);

          modal.addComponents(
            new ActionRowBuilder().addComponents(steamInput),
            new ActionRowBuilder().addComponents(serverInput),
            new ActionRowBuilder().addComponents(descInput)
          );
        }

        return interaction.showModal(modal);
      }

      // 🔒 CLOSE TICKET
      if (interaction.customId === 'btn_close_ticket') {
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('btn_confirm_close')
            .setLabel('Confirm Close')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⚠️'),
          new ButtonBuilder()
            .setCustomId('btn_cancel_close')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('✖️')
        );

        return interaction.reply({
          content: '⚠️ **Are you sure you want to close and delete this ticket channel?**',
          components: [confirmRow],
        });
      }

      if (interaction.customId === 'btn_cancel_close') {
        return interaction.message.delete().catch(() => {});
      }

      if (interaction.customId === 'btn_confirm_close') {
        const ticketRoleId = config.ticketRoleId || '1561826282444947517';
        const isStaff =
          interaction.member.roles.cache.has(ticketRoleId) ||
          interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
          interaction.channel.topic?.includes(interaction.user.id);

        if (!isStaff) {
          return interaction.reply({
            content: '❌ You do not have permission to close this ticket.',
            flags: 64,
          });
        }

        await interaction.reply({
          content: `🔒 **Ticket is being closed by <@${interaction.user.id}>... Deleting channel in 5 seconds.**`,
        });

        // Attempt DM confirmation
        const topicMatch = interaction.channel.topic?.match(/\((\d{17,20})\)/);
        if (topicMatch) {
          const ownerId = topicMatch[1];
          const owner = await client.users.fetch(ownerId).catch(() => null);
          if (owner) {
            owner
              .send(
                `🔒 Your EvoDino support ticket (**#${interaction.channel.name}**) has been closed by <@${interaction.user.id}>.\n` +
                `Thank you for contacting EvoDino Support!`
              )
              .catch(() => {});
          }
        }

        setTimeout(() => {
          interaction.channel.delete().catch((e) => console.error('Failed to delete ticket channel:', e.message));
        }, 5000);
      }

      // 🙋 CLAIM TICKET
      if (interaction.customId === 'btn_claim_ticket') {
        const ticketRoleId = config.ticketRoleId || '1561826282444947517';
        const isStaff =
          interaction.member.roles.cache.has(ticketRoleId) ||
          interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isStaff) {
          return interaction.reply({
            content: `❌ Only staff with the <@&${ticketRoleId}> role can claim tickets!`,
            flags: 64,
          });
        }

        return interaction.reply({
          content: `🙋 **Ticket Claimed!** <@${interaction.user.id}> is now actively handling this ticket.`,
        });
      }
    }

    // 📝 Modal Submission Handler
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('modal_ticket_')) {
        const ticketTypeKey = interaction.customId.replace('modal_', '');
        const ticketInfo = TICKET_TYPES[ticketTypeKey] || TICKET_TYPES.ticket_general;
        const categoryId = config.ticketCategoryId || '1561350687160533102';
        const ticketRoleId = config.ticketRoleId || '1561826282444947517';

        const steamId = interaction.fields.getTextInputValue('steam_id');
        const serverName = interaction.fields.getTextInputValue('server_name') || 'EU1';
        const description = interaction.fields.getTextInputValue('problem_description');
        let reportedPlayer = null;
        let cheatType = null;
        try {
          reportedPlayer = interaction.fields.getTextInputValue('reported_player');
        } catch {}
        try {
          cheatType = interaction.fields.getTextInputValue('cheat_type');
        } catch {}

        await interaction.deferReply({ flags: 64 });

        try {
          const cleanName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
          const channelName = `🦖・${ticketInfo.prefix}-${cleanName || 'ticket'}`;

          const permissionOverwrites = [
            {
              id: interaction.guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.EmbedLinks,
              ],
            },
            {
              id: client.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles,
              ],
            },
          ];

          if (ticketRoleId && interaction.guild.roles.cache.has(ticketRoleId)) {
            permissionOverwrites.push({
              id: ticketRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            });
          }

          const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryId,
            permissionOverwrites,
            topic: `EvoDino Support | Category: ${ticketInfo.title} | User: ${interaction.user.tag} (${interaction.user.id}) | Steam: ${steamId} | Server: ${serverName}`,
          });

          const embedFields = [
            { name: '👤 Member', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
            { name: '🎮 Steam ID', value: `\`${steamId}\``, inline: true },
            { name: '🌐 Server', value: `**${serverName}**`, inline: true },
            { name: '📋 Category', value: `${ticketInfo.title}`, inline: true },
            { name: '🛡️ Assigned Role', value: `<@&${ticketRoleId}>`, inline: true },
          ];

          if (reportedPlayer) {
            embedFields.push({ name: '🎯 Reported Player', value: `\`${reportedPlayer}\``, inline: true });
          }
          if (cheatType) {
            embedFields.push({ name: '🚨 Cheat / Rule Break', value: `**${cheatType}**`, inline: true });
          }

          embedFields.push({
            name: reportedPlayer ? '📝 Incident Details & Proof' : '📝 Description & Details',
            value: description,
          });

          const ticketEmbed = new EmbedBuilder()
            .setColor(ticketInfo.color)
            .setTitle(`🦖 EVODINO SUPPORT • ${ticketInfo.title.toUpperCase()}`)
            .setDescription(
              `Hello ${interaction.member}! Welcome to your private support ticket.\n` +
              `Our staff team (<@&${ticketRoleId}>) has been notified and will assist you shortly.`
            )
            .addFields(embedFields)
            .setFooter({ text: 'Click "Close Ticket" when your issue has been resolved' })
            .setTimestamp();

          const ticketRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('btn_close_ticket')
              .setLabel('Close Ticket')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('🔒'),
            new ButtonBuilder()
              .setCustomId('btn_claim_ticket')
              .setLabel('Claim Ticket')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🙋')
          );

          await ticketChannel.send({
            content: `👋 Welcome <@${interaction.user.id}>! Staff notification: <@&${ticketRoleId}>`,
            embeds: [ticketEmbed],
            components: [ticketRow],
          });

          // DM confirmation to user
          interaction.user
            .send(
              `🦖 **EvoDino Support:** Your ticket for **${ticketInfo.title}** on **${serverName}** has been created!\n` +
              `📌 Channel: <#${ticketChannel.id}> in **${interaction.guild.name}**.\n` +
              `Our staff will assist you there shortly.`
            )
            .catch(() => {});

          return interaction.editReply({
            content: `✅ Your ticket has been created: <#${ticketChannel.id}>! Click to jump to your ticket.`,
          });
        } catch (createErr) {
          console.error('Failed to create ticket channel:', createErr);
          return interaction.editReply({
            content: `❌ Failed to create ticket channel: ${createErr.message}`,
          });
        }
      }
    }

    // ⚡ Slash Commands
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    try {
      if (commandName === 'testwelcome') {
        const channelId = config.welcomeChannelId;
        const targetChannel = await client.channels.fetch(channelId).catch(() => null);

        if (!targetChannel) {
          return interaction.reply({
            content: `❌ Channel not found with ID \`${channelId}\`. Use \`/setwelcome\` to configure it.`,
            flags: 64,
          });
        }

        const payload = createWelcomePayload(interaction.member, interaction.user, 1);

        try {
          await targetChannel.send(payload);
          await interaction.reply({
            content: `✅ Test welcome card successfully sent to ${targetChannel}!`,
            flags: 64,
          });
        } catch (sendError) {
          console.warn('Embed/file send failed, trying text:', sendError.message);
          try {
            await targetChannel.send(
              `🎉 **Welcome to ${interaction.guild.name}, ${interaction.member}!**\n` +
              `📨 Invited by: ${interaction.user} (Test)\n` +
              `👥 Member #${interaction.guild.memberCount}`
            );
            await interaction.reply({
              content: `⚠️ Sent text fallback to ${targetChannel} (Bot may lack \`Embed Links\` or \`Attach Files\` permission).`,
              flags: 64,
            });
          } catch (textErr) {
            await interaction.reply({
              content: `❌ Failed to send welcome card: ${textErr.message}`,
              flags: 64,
            });
          }
        }
      }

      else if (commandName === 'setwelcome') {
        const target = interaction.options.getChannel('channel');
        config.welcomeChannelId = target.id;
        saveConfig(config);
        await interaction.reply({
          content: `✅ Welcome channel successfully updated to ${target} (\`${target.id}\`)!`,
          flags: 64,
        });
      }

      else if (commandName === 'send-roles') {
        const rolesPayload = createRolesPanel(interaction.guild);
        await interaction.channel.send(rolesPayload);
        await interaction.reply({
          content: '✅ Self-roles panel successfully deployed to this channel!',
          flags: 64,
        });
      }

      else if (commandName === 'send-tickets') {
        const deskChId = config.supportDeskChannelId || '1561350984884682806';
        const guideChId = config.supportGuideChannelId || '1561351453132591106';

        const deskCh = await client.channels.fetch(deskChId).catch(() => null);
        const guideCh = await client.channels.fetch(guideChId).catch(() => null);

        let report = '';
        if (deskCh) {
          await deskCh.send(createSupportDeskPanel(interaction.guild));
          report += `✅ Support Desk panel sent to ${deskCh}!\n`;
        }
        if (guideCh) {
          await guideCh.send(createSupportGuidePanel(interaction.guild));
          report += `✅ Support Guide panel sent to ${guideCh}!\n`;
        }

        await interaction.reply({
          content: report || '❌ Failed to find target channels.',
          flags: 64,
        });
      }

      else if (commandName === 'close') {
        if (!interaction.channel.name.startsWith('🦖・') && !interaction.channel.name.includes('ticket')) {
          return interaction.reply({
            content: '❌ This command can only be used inside a ticket channel.',
            flags: 64,
          });
        }

        await interaction.reply({
          content: `🔒 **Ticket closing requested by <@${interaction.user.id}>... Channel deleting in 5 seconds.**`,
        });

        setTimeout(() => {
          interaction.channel.delete().catch(() => {});
        }, 5000);
      }

      else if (commandName === 'setautorole') {
        const role = interaction.options.getRole('role');
        config.autoRoleId = role.id;
        saveConfig(config);
        await interaction.reply({
          content: `✅ Default auto-role updated to **${role.name}** (\`${role.id}\`)!`,
          flags: 64,
        });
      }

      else if (commandName === 'setstatus') {
        const text = interaction.options.getString('text');
        client.user.setActivity(text, { type: ActivityType.Custom });
        await interaction.reply({
          content: `✅ Bot status successfully set to: **"${text}"**`,
          flags: 64,
        });
      }

      else if (commandName === 'invites') {
        const target = interaction.options.getUser('user') || interaction.user;
        const guildInvites = await interaction.guild.invites.fetch().catch(() => null);

        if (!guildInvites) {
          return interaction.reply({ content: '❌ Could not retrieve invites.', flags: 64 });
        }

        let userUses = 0;
        guildInvites.forEach((inv) => {
          if (inv.inviter && inv.inviter.id === target.id) {
            userUses += inv.uses || 0;
          }
        });

        const embed = new EmbedBuilder()
          .setColor('#00FFE0')
          .setTitle(`📊 Invite Statistics • ${target.tag}`)
          .setThumbnail(target.displayAvatarURL({ dynamic: true }))
          .setDescription(`**${target}** has invited **${userUses}** members to **${interaction.guild.name}**!`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      else if (commandName === 'ping') {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`🏓 **Pong!** Bot Latency: \`${latency}ms\` • API Heartbeat: \`${Math.round(client.ws.ping)}ms\``);
      }

      else if (commandName === 'help') {
        const embed = new EmbedBuilder()
          .setColor('#00FFE0')
          .setTitle(`🦖 ${interaction.guild.name} • Command Guide`)
          .setDescription('List of available bot slash commands:')
          .addFields(
            { name: '🎟️ Support Tickets', value: '`/send-tickets` • `/close`' },
            { name: '👋 Welcome & Roles', value: '`/testwelcome` • `/setwelcome` • `/send-roles` • `/setautorole`' },
            { name: '📊 Statistics & Info', value: '`/invites` • `/serverinfo` • `/userinfo` • `/ping`' },
            { name: '🛡️ Moderation', value: '`/clear` • `/kick` • `/setstatus`' }
          )
          .setFooter({ text: 'EvoDino Official Bot' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      else if (commandName === 'serverinfo') {
        const { guild } = interaction;
        const embed = new EmbedBuilder()
          .setColor('#00FFE0')
          .setTitle(`Server Info • ${guild.name}`)
          .setThumbnail(guild.iconURL({ dynamic: true }) || null)
          .addFields(
            { name: '🆔 Server ID', value: guild.id, inline: true },
            { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
            { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
            { name: '📅 Created On', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      else if (commandName === 'userinfo') {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        const embed = new EmbedBuilder()
          .setColor('#00FFE0')
          .setTitle(`User Info • ${user.tag}`)
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '🆔 User ID', value: user.id, inline: true },
            { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '📥 Joined Server', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      else if (commandName === 'clear') {
        const amount = interaction.options.getInteger('amount');
        const deleted = await interaction.channel.bulkDelete(amount, true);
        await interaction.reply({ content: `🧹 Deleted **${deleted.size}** messages.`, flags: 64 });
      }

      else if (commandName === 'kick') {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason specified';
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Member not found.', flags: 64 });
        if (!member.kickable) return interaction.reply({ content: '❌ Cannot kick this member (Role hierarchy).', flags: 64 });

        await member.kick(reason);
        await interaction.reply({ content: `👢 Kicked **${targetUser.tag}**. Reason: ${reason}` });
      }
    } catch (cmdErr) {
      console.error(`Command error ${commandName}:`, cmdErr.message);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: `❌ An error occurred: ${cmdErr.message}`, flags: 64 }).catch(() => {});
      }
    }
  });

  const token = process.env.DISCORD_TOKEN;
  client.login(token).catch((err) => {
    if (withMembersIntent && err.message && err.message.includes('disallowed intents')) {
      console.warn('⚠️ Server Members Intent not enabled in Developer Portal. Starting with base intents...');
      initBot(false);
    } else {
      console.error('❌ Login error:', err.message);
    }
  });
}

// Start bot
initBot(true);
