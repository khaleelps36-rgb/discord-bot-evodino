const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  ChannelType,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const LEVELS_CONFIG_PATH = path.join(__dirname, 'levels_config.json');
const LEVELS_DATA_PATH = path.join(__dirname, 'levels_data.json');
const LEVELS_TMP_PATH = path.join(__dirname, 'levels_data.json.tmp');

const TEXT_XP_COOLDOWN_MS = 15 * 1000;
const VOICE_XP_INTERVAL_MS = 60 * 1000;
const VOICE_XP_PER_MINUTE = 20;
const DISCORD_SYNC_THROTTLE_MS = 15 * 1000;
const DISCORD_PERIODIC_SYNC_MS = 2 * 60 * 1000;
const LEADERBOARD_REFRESH_MS = 5 * 60 * 1000;

/**
 * Computes total cumulative XP required to reach a given level.
 * Formula: 50 * L^2 + 50 * L (Lvl 1 = 100 XP, Lvl 5 = 1,500 XP, Lvl 50 = 127,500 XP).
 */
function xpForLevel(level) {
  if (!Number.isFinite(level) || level <= 0) return 0;
  return Math.floor(50 * level * level + 50 * level);
}

/**
 * Derives the exact integer level for a given cumulative XP total.
 */
function getLevelFromXp(xp) {
  if (!Number.isFinite(xp) || xp <= 0) return 0;
  let level = 0;
  while (xp >= xpForLevel(level + 1)) {
    level++;
  }
  return level;
}

/**
 * Formats an ASCII progress bar for Discord embeds (100% English).
 */
function buildProgressBar(current, total, size = 12) {
  if (!Number.isFinite(total) || total <= 0) {
    return `${'▓'.repeat(size)} 100%`;
  }
  const ratio = Math.max(0, Math.min(1, current / total));
  const filled = Math.round(ratio * size);
  const empty = Math.max(0, size - filled);
  const pct = Math.round(ratio * 100);
  return `${'▓'.repeat(filled)}${'░'.repeat(empty)} ${pct}%`;
}

/**
 * Formats active voice minutes into human-readable hours and minutes.
 */
function formatVoiceTime(totalMinutes) {
  const mins = Math.max(0, Math.floor(totalMinutes || 0));
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours === 0) return `${rem}m`;
  if (rem === 0) return `${hours}h`;
  return `${hours}h ${rem}m`;
}

/**
 * Returns the highest eligible rank role tier matching or below the given level.
 */
function getEligibleRole(level, roleTiers = []) {
  if (!Array.isArray(roleTiers) || roleTiers.length === 0 || level <= 0) return null;
  let best = null;
  for (const tier of roleTiers) {
    if (level >= tier.level && (!best || tier.level > best.level)) {
      best = tier;
    }
  }
  return best;
}

/**
 * Sorts user activity records into a ranked array for 'overall', 'text', or 'voice'.
 */
function sortLeaderboard(usersObj = {}, mode = 'overall') {
  const list = Object.entries(usersObj).map(([userId, u]) => {
    const textXp = u.textXp || 0;
    const voiceXp = u.voiceXp || 0;
    return {
      userId,
      username: u.username || 'Unknown',
      textXp,
      textLevel: u.textLevel ?? getLevelFromXp(textXp),
      messages: u.messages || 0,
      voiceXp,
      voiceLevel: u.voiceLevel ?? getLevelFromXp(voiceXp),
      voiceMinutes: u.voiceMinutes || 0,
      totalXp: textXp + voiceXp,
    };
  });

  if (mode === 'text') {
    return list
      .filter((u) => u.textXp > 0 || u.messages > 0)
      .sort((a, b) => b.textXp - a.textXp || b.messages - a.messages);
  }
  if (mode === 'voice') {
    return list
      .filter((u) => u.voiceXp > 0 || u.voiceMinutes > 0)
      .sort((a, b) => b.voiceXp - a.voiceXp || b.voiceMinutes - a.voiceMinutes);
  }
  return list
    .filter((u) => u.totalXp > 0 || u.messages > 0 || u.voiceMinutes > 0)
    .sort((a, b) => b.totalXp - a.totalXp || b.textXp - a.textXp);
}

/**
 * Safely loads levels_config.json from disk.
 */
function loadLevelsConfig() {
  try {
    return JSON.parse(fs.readFileSync(LEVELS_CONFIG_PATH, 'utf8'));
  } catch {
    return {
      ranksChannelId: null,
      leaderboardChannelId: null,
      leaderboardMessageId: null,
      levelDbChannelId: null,
      textRoles: [],
      voiceRoles: [],
    };
  }
}

/**
 * Persists levels_config.json safely.
 */
function saveLevelsConfig(cfg) {
  fs.writeFileSync(LEVELS_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

/**
 * Builds the 100% English live Leaderboard message payload (embed + interactive tabs).
 */
function buildLeaderboardPayload(guild, data, mode = 'overall', cfg = loadLevelsConfig()) {
  const validMode = ['overall', 'text', 'voice'].includes(mode) ? mode : 'overall';
  const ranked = sortLeaderboard(data?.users || {}, validMode);
  const top10 = ranked.slice(0, 10);

  const titles = {
    overall: '🏆 EVODINO LEADERBOARD • OVERALL ACTIVITY',
    text: '💬 EVODINO LEADERBOARD • TOP TEXT CHATTERS',
    voice: '🔊 EVODINO LEADERBOARD • TOP VOICE ACTIVITY',
  };

  const subtitles = {
    overall: 'Combined rankings across both **Text Chat XP** and **Voice Activity XP**.',
    text: 'Top members ranked by **Text Chat XP** and message activity.',
    voice: 'Top members ranked by **Voice Activity XP** and time spent in voice channels.',
  };

  const medals = ['🥇', '🥈', '🥉'];
  const lines = top10.map((entry, idx) => {
    const badge = medals[idx] || `\`#${idx + 1}\``;
    if (validMode === 'text') {
      const role = getEligibleRole(entry.textLevel, cfg.textRoles);
      const roleTag = role ? ` • <@&${role.roleId}>` : '';
      return `${badge} <@${entry.userId}> — **Lvl ${entry.textLevel}** (\`${entry.textXp.toLocaleString()} XP\` • \`${entry.messages.toLocaleString()} msgs\`)${roleTag}`;
    }
    if (validMode === 'voice') {
      const role = getEligibleRole(entry.voiceLevel, cfg.voiceRoles);
      const roleTag = role ? ` • <@&${role.roleId}>` : '';
      return `${badge} <@${entry.userId}> — **Lvl ${entry.voiceLevel}** (\`${entry.voiceXp.toLocaleString()} XP\` • \`${formatVoiceTime(entry.voiceMinutes)}\`)${roleTag}`;
    }
    return `${badge} <@${entry.userId}> — **${entry.totalXp.toLocaleString()} XP** • 💬 Lv\`${entry.textLevel}\` | 🔊 Lv\`${entry.voiceLevel}\``;
  });

  const embed = new EmbedBuilder()
    .setColor('#00FFE0')
    .setTitle(titles[validMode])
    .setDescription(
      `${subtitles[validMode]}\n\n` +
      (lines.length > 0
        ? lines.join('\n')
        : '*No activity recorded yet! Start chatting or join a voice room to claim the #1 spot.* 🦖')
    )
    .setThumbnail(guild?.iconURL({ dynamic: true }) || null)
    .setFooter({
      text: `Tracked Members: ${ranked.length} • Use /rank to view your personal stats`,
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('lb_overall')
      .setLabel('Overall Ranks')
      .setEmoji('🏆')
      .setStyle(validMode === 'overall' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('lb_text')
      .setLabel('Top Text Chat')
      .setEmoji('💬')
      .setStyle(validMode === 'text' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('lb_voice')
      .setLabel('Top Voice')
      .setEmoji('🔊')
      .setStyle(validMode === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('lb_refresh')
      .setLabel('Refresh')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [row] };
}

// Slash commands contributed by the Leveling module
const levelingCommands = [
  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your or another member’s Text & Voice activity levels and ranks')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Member to inspect (optional)').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the top 10 most active members in Text Chat, Voice, or Overall')
    .addStringOption((opt) =>
      opt
        .setName('category')
        .setDescription('Ranking category')
        .setRequired(false)
        .addChoices(
          { name: 'Overall Ranks', value: 'overall' },
          { name: 'Top Text Chat', value: 'text' },
          { name: 'Top Voice Activity', value: 'voice' }
        )
    ),

  new SlashCommandBuilder()
    .setName('send-leaderboard')
    .setDescription('Deploy a fresh interactive Activity Leaderboard panel (Admins)')
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Target channel (defaults to current channel)').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('setxp')
    .setDescription('Set a member’s Text or Voice XP directly and sync their rank role (Admins)')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Target member').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('type')
        .setDescription('XP track to modify')
        .setRequired(true)
        .addChoices(
          { name: 'Text Chat XP', value: 'text' },
          { name: 'Voice Activity XP', value: 'voice' }
        )
    )
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('New XP amount (>= 0)').setRequired(true).setMinValue(0)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

/**
 * Creates and wires the EvoDino dual-track (Text + Voice) leveling engine.
 */
function createLevelingSystem(client, { loadConfig }) {
  const textCooldowns = new Map();
  let dbData = loadLocalData();
  let dirty = false;
  let lastDiscordSyncAt = 0;
  let isSyncing = false;
  let intervalsStarted = false;

  function loadLocalData() {
    try {
      const parsed = JSON.parse(fs.readFileSync(LEVELS_DATA_PATH, 'utf8'));
      if (parsed && typeof parsed.users === 'object') return parsed;
    } catch {}
    return { users: {}, updatedAt: new Date().toISOString() };
  }

  function saveLocalData() {
    dbData.updatedAt = new Date().toISOString();
    fs.writeFileSync(LEVELS_TMP_PATH, JSON.stringify(dbData, null, 2), 'utf8');
    fs.renameSync(LEVELS_TMP_PATH, LEVELS_DATA_PATH);
  }

  function ensureUser(userId, username) {
    if (!dbData.users[userId]) {
      dbData.users[userId] = {
        textXp: 0,
        textLevel: 0,
        messages: 0,
        voiceXp: 0,
        voiceLevel: 0,
        voiceMinutes: 0,
        username: username || 'Unknown',
      };
    } else if (username && dbData.users[userId].username !== username) {
      dbData.users[userId].username = username;
    }
    return dbData.users[userId];
  }

  function mergeUserRecords(remoteUsers = {}) {
    for (const [uid, r] of Object.entries(remoteUsers)) {
      const local = ensureUser(uid, r.username);
      local.textXp = Math.max(local.textXp || 0, r.textXp || 0);
      local.messages = Math.max(local.messages || 0, r.messages || 0);
      local.voiceXp = Math.max(local.voiceXp || 0, r.voiceXp || 0);
      local.voiceMinutes = Math.max(local.voiceMinutes || 0, r.voiceMinutes || 0);
      local.textLevel = getLevelFromXp(local.textXp);
      local.voiceLevel = getLevelFromXp(local.voiceXp);
      if (r.username && (!local.username || local.username === 'Unknown')) {
        local.username = r.username;
      }
    }
  }

  async function findSnapshotMessage(channel) {
    let pinnedList = [];
    if (typeof channel.messages.fetchPins === 'function') {
      const pins = await channel.messages.fetchPins().catch(() => null);
      if (pins?.items) pinnedList = pins.items.map((i) => i.message);
    } else if (typeof channel.messages.fetchPinned === 'function') {
      const pins = await channel.messages.fetchPinned().catch(() => null);
      if (pins) pinnedList = [...pins.values()];
    }

    const fromPins = pinnedList.find(
      (m) => m.author?.id === client.user.id && m.attachments?.some((a) => a.name === 'levels_data.json')
    );
    if (fromPins) return fromPins;

    const recent = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    if (!recent) return null;
    return (
      [...recent.values()].find(
        (m) => m.author?.id === client.user.id && m.attachments?.some((a) => a.name === 'levels_data.json')
      ) || null
    );
  }

  /**
   * Loads persisted XP snapshot from #level-db on startup (survives Render restarts).
   */
  async function hydrateFromDiscord() {
    const cfg = loadLevelsConfig();
    if (!cfg.levelDbChannelId) return;

    try {
      const ch = await client.channels.fetch(cfg.levelDbChannelId).catch(() => null);
      if (!ch || !ch.isTextBased()) return;

      const msg = await findSnapshotMessage(ch);
      if (!msg) return;

      const att = msg.attachments.find((a) => a.name === 'levels_data.json');
      if (!att?.url) return;

      const res = await fetch(att.url);
      if (!res.ok) return;
      const remote = await res.json();
      if (remote && typeof remote.users === 'object') {
        mergeUserRecords(remote.users);
        saveLocalData();
        console.log(`💾 Leveling DB hydrated from Discord (${Object.keys(dbData.users).length} tracked members)`);
      }
    } catch (err) {
      console.warn('⚠️ Failed hydrating levels snapshot from Discord:', err.message);
    }
  }

  /**
   * Persists the latest levels_data.json attachment into the single pinned message in #level-db.
   */
  async function syncToDiscord(force = false) {
    if (isSyncing) return;
    if (!force && (!dirty || Date.now() - lastDiscordSyncAt < DISCORD_SYNC_THROTTLE_MS)) return;

    const cfg = loadLevelsConfig();
    if (!cfg.levelDbChannelId) return;

    isSyncing = true;
    try {
      saveLocalData();
      const ch = await client.channels.fetch(cfg.levelDbChannelId).catch(() => null);
      if (!ch || !ch.isTextBased()) return;

      const payloadBuffer = Buffer.from(JSON.stringify(dbData, null, 2), 'utf8');
      const file = new AttachmentBuilder(payloadBuffer, { name: 'levels_data.json' });
      const content = `💾 **EvoDino Leveling Snapshot** • Tracked Members: \`${Object.keys(dbData.users).length}\` • Last Sync: <t:${Math.floor(Date.now() / 1000)}:R>`;

      const existing = await findSnapshotMessage(ch);
      if (existing) {
        await existing.edit({ content, files: [file] });
      } else {
        const created = await ch.send({ content, files: [file] });
        await created.pin().catch(() => {});
      }

      dirty = false;
      lastDiscordSyncAt = Date.now();
    } catch (err) {
      console.warn('⚠️ Leveling Discord DB sync warning:', err.message);
    } finally {
      isSyncing = false;
    }
  }

  /**
   * Syncs a member's rank roles for a specific track ('text' or 'voice'), removing lower ranks.
   * Returns the tier object ONLY if the member did not already hold that highest unlocked role.
   */
  async function syncMemberRankRoles(member, mode, level) {
    if (!member) return null;
    const cfg = loadLevelsConfig();
    const tiers = mode === 'text' ? cfg.textRoles || [] : cfg.voiceRoles || [];
    if (tiers.length === 0) return null;

    const target = getEligibleRole(level, tiers);
    const targetRoleId = target?.roleId || null;

    const toRemove = tiers
      .map((t) => t.roleId)
      .filter((rid) => rid && rid !== targetRoleId && member.roles.cache.has(rid));

    if (toRemove.length > 0) {
      await member.roles.remove(toRemove).catch((e) =>
        console.warn(`⚠️ Failed removing old ${mode} rank roles for ${member.user?.tag}:`, e.message)
      );
    }

    if (targetRoleId && !member.roles.cache.has(targetRoleId)) {
      const existsInGuild = member.guild.roles.cache.has(targetRoleId);
      if (existsInGuild) {
        await member.roles.add(targetRoleId).catch((e) =>
          console.warn(`⚠️ Failed assigning ${target.name} to ${member.user?.tag}:`, e.message)
        );
        return target;
      }
    }

    return null;
  }

  /**
   * Tags the member in #ranks with a clean English Level-Up Embed (and newly unlocked rank if any).
   */
  async function announceLevelUp(guild, member, mode, oldLevel, newLevel, unlockedTier, userStats) {
    const cfg = loadLevelsConfig();
    if (!cfg.ranksChannelId) return;

    try {
      const ranksCh = await client.channels.fetch(cfg.ranksChannelId).catch(() => null);
      if (!ranksCh || !ranksCh.isTextBased()) return;

      const isText = mode === 'text';
      const xp = isText ? userStats.textXp : userStats.voiceXp;
      const curFloor = xpForLevel(newLevel);
      const nextFloor = xpForLevel(newLevel + 1);
      const bar = buildProgressBar(xp - curFloor, nextFloor - curFloor, 12);

      const tiers = isText ? cfg.textRoles : cfg.voiceRoles;
      const currentRankTier = getEligibleRole(newLevel, tiers);

      const fields = [
        {
          name: isText ? '💬 Chat Level' : '🔊 Voice Level',
          value: `\`Level ${oldLevel}\` ➔ **\`Level ${newLevel}\`**`,
          inline: true,
        },
        {
          name: isText ? '📨 Total Messages' : '⏱️ Voice Time',
          value: isText
            ? `\`${(userStats.messages || 0).toLocaleString()} messages\``
            : `\`${formatVoiceTime(userStats.voiceMinutes || 0)}\``,
          inline: true,
        },
        {
          name: '📊 Progress to Next Level',
          value: `\`${bar}\` (${xp.toLocaleString()} / ${nextFloor.toLocaleString()} XP)`,
          inline: false,
        },
      ];

      if (unlockedTier) {
        fields.push({
          name: '🎖️ New Rank Unlocked!',
          value: `Promoted to <@&${unlockedTier.roleId}>! Your new custom badge is now displayed next to your name.`,
          inline: false,
        });
      } else if (currentRankTier) {
        fields.push({
          name: '🛡️ Current Rank',
          value: `<@&${currentRankTier.roleId}>`,
          inline: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(unlockedTier ? '#FFD166' : isText ? '#00FFE0' : '#A29BFE')
        .setTitle(
          unlockedTier
            ? `🌟 RANK UP • ${isText ? 'NEW CHAT RANK' : 'NEW VOICE RANK'}!`
            : `📈 LEVEL UP • ${isText ? 'TEXT CHAT' : 'VOICE ACTIVITY'}!`
        )
        .setDescription(`Way to go <@${member.id}>! Keep climbing the **EvoDino** activity ranks.`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(fields)
        .setFooter({ text: `${guild.name} Activity System • Check /rank anytime` })
        .setTimestamp();

      await ranksCh.send({
        content: `🎉 Congratulations <@${member.id}>! You reached **${isText ? 'Chat' : 'Voice'} Level ${newLevel}**${unlockedTier ? ` and unlocked <@&${unlockedTier.roleId}>` : ''}!`,
        embeds: [embed],
      });
    } catch (err) {
      console.warn('⚠️ Failed sending level-up announcement:', err.message);
    }
  }

  /**
   * Edits the pinned/live message in #leaderboards with updated Overall rankings.
   */
  async function updateLiveLeaderboard() {
    const cfg = loadLevelsConfig();
    if (!cfg.leaderboardChannelId || !cfg.leaderboardMessageId) return;

    try {
      const ch = await client.channels.fetch(cfg.leaderboardChannelId).catch(() => null);
      if (!ch || !ch.isTextBased()) return;

      const msg = await ch.messages.fetch(cfg.leaderboardMessageId).catch(() => null);
      if (!msg) return;

      const payload = buildLeaderboardPayload(ch.guild, dbData, 'overall', cfg);
      await msg.edit(payload);
    } catch (err) {
      console.warn('⚠️ Failed updating live leaderboard:', err.message);
    }
  }

  /**
   * Periodic voice XP loop executed every 60s across connected active members.
   */
  async function processVoiceTick() {
    const botConfig = loadConfig();
    const jtcId = botConfig.joinToCreateChannelId || '1569447343584190466';
    let anyChange = false;

    for (const guild of client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        const isVoice = channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice;
        if (!isVoice) continue;
        if (channel.id === guild.afkChannelId || channel.id === jtcId) continue;

        for (const member of channel.members.values()) {
          if (member.user.bot) continue;
          if (member.voice.selfDeaf || member.voice.serverDeaf) continue;

          const stats = ensureUser(member.id, member.user.username);
          const oldLevel = stats.voiceLevel;
          stats.voiceMinutes = (stats.voiceMinutes || 0) + 1;
          stats.voiceXp = (stats.voiceXp || 0) + VOICE_XP_PER_MINUTE;
          const newLevel = getLevelFromXp(stats.voiceXp);
          stats.voiceLevel = newLevel;
          anyChange = true;
          dirty = true;

          if (newLevel > oldLevel) {
            const unlocked = await syncMemberRankRoles(member, 'voice', newLevel);
            await announceLevelUp(guild, member, 'voice', oldLevel, newLevel, unlocked, stats);
          }
        }
      }
    }

    if (anyChange) {
      saveLocalData();
    }
  }

  function registerEvents() {
    client.once('clientReady', async () => {
      await hydrateFromDiscord();
      await updateLiveLeaderboard();

      if (!intervalsStarted) {
        intervalsStarted = true;
        setInterval(() => processVoiceTick().catch(() => {}), VOICE_XP_INTERVAL_MS);
        setInterval(() => {
          if (dirty) syncToDiscord(false).catch(() => {});
        }, DISCORD_PERIODIC_SYNC_MS);
        setInterval(() => {
          updateLiveLeaderboard().catch(() => {});
        }, LEADERBOARD_REFRESH_MS);
      }
    });

    client.on('messageCreate', async (message) => {
      if (!message.guild || message.author.bot) return;

      const userId = message.author.id;
      const stats = ensureUser(userId, message.author.username);
      stats.messages = (stats.messages || 0) + 1;
      dirty = true;

      const now = Date.now();
      const lastGain = textCooldowns.get(userId) || 0;
      if (now - lastGain < TEXT_XP_COOLDOWN_MS) {
        saveLocalData();
        return;
      }

      textCooldowns.set(userId, now);
      const gained = 15 + Math.floor(Math.random() * 11); // 15 - 25 XP
      const oldLevel = stats.textLevel;
      stats.textXp = (stats.textXp || 0) + gained;
      const newLevel = getLevelFromXp(stats.textXp);
      stats.textLevel = newLevel;

      saveLocalData();

      if (newLevel > oldLevel) {
        const member =
          message.member || (await message.guild.members.fetch(userId).catch(() => null));
        const unlocked = member ? await syncMemberRankRoles(member, 'text', newLevel) : null;
        if (member) {
          await announceLevelUp(message.guild, member, 'text', oldLevel, newLevel, unlocked, stats);
        }
        await syncToDiscord(false);
        await updateLiveLeaderboard();
      }
    });
  }

  async function handleInteraction(interaction) {
    if (interaction.isButton()) {
      const modeMap = {
        lb_overall: 'overall',
        lb_text: 'text',
        lb_voice: 'voice',
        lb_refresh: 'overall',
      };
      if (!modeMap[interaction.customId]) return false;

      let mode = modeMap[interaction.customId];
      if (interaction.customId === 'lb_refresh') {
        const curTitle = interaction.message?.embeds?.[0]?.title || '';
        if (curTitle.includes('TEXT')) mode = 'text';
        else if (curTitle.includes('VOICE')) mode = 'voice';
        else mode = 'overall';
      }

      const payload = buildLeaderboardPayload(interaction.guild, dbData, mode);
      await interaction.update(payload);
      return true;
    }

    if (!interaction.isChatInputCommand()) return false;
    const { commandName } = interaction;
    if (!['rank', 'leaderboard', 'send-leaderboard', 'setxp'].includes(commandName)) {
      return false;
    }

    const cfg = loadLevelsConfig();

    if (commandName === 'rank') {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const stats = dbData.users[targetUser.id] || {
        textXp: 0,
        textLevel: 0,
        messages: 0,
        voiceXp: 0,
        voiceLevel: 0,
        voiceMinutes: 0,
        username: targetUser.username,
      };

      const textLvl = getLevelFromXp(stats.textXp);
      const voiceLvl = getLevelFromXp(stats.voiceXp);

      const overallRankIdx = sortLeaderboard(dbData.users, 'overall').findIndex((u) => u.userId === targetUser.id);
      const textRankIdx = sortLeaderboard(dbData.users, 'text').findIndex((u) => u.userId === targetUser.id);
      const voiceRankIdx = sortLeaderboard(dbData.users, 'voice').findIndex((u) => u.userId === targetUser.id);

      const tCur = xpForLevel(textLvl);
      const tNext = xpForLevel(textLvl + 1);
      const tBar = buildProgressBar(stats.textXp - tCur, tNext - tCur, 10);
      const tRole = getEligibleRole(textLvl, cfg.textRoles);

      const vCur = xpForLevel(voiceLvl);
      const vNext = xpForLevel(voiceLvl + 1);
      const vBar = buildProgressBar(stats.voiceXp - vCur, vNext - vCur, 10);
      const vRole = getEligibleRole(voiceLvl, cfg.voiceRoles);

      const totalXp = (stats.textXp || 0) + (stats.voiceXp || 0);

      const embed = new EmbedBuilder()
        .setColor('#00FFE0')
        .setTitle(`📈 Activity Profile • ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          {
            name: '💬 Text Chat Rank',
            value:
              `**Level ${textLvl}** • Rank: \`${textRankIdx >= 0 ? `#${textRankIdx + 1}` : 'Unranked'}\`\n` +
              `Progress: \`${tBar}\`\n` +
              `XP: \`${stats.textXp.toLocaleString()} / ${tNext.toLocaleString()}\` • Messages: \`${(stats.messages || 0).toLocaleString()}\`\n` +
              `Role: ${tRole ? `<@&${tRole.roleId}>` : '`None yet (Lvl 1 required)`'}`,
            inline: false,
          },
          {
            name: '🔊 Voice Activity Rank',
            value:
              `**Level ${voiceLvl}** • Rank: \`${voiceRankIdx >= 0 ? `#${voiceRankIdx + 1}` : 'Unranked'}\`\n` +
              `Progress: \`${vBar}\`\n` +
              `XP: \`${stats.voiceXp.toLocaleString()} / ${vNext.toLocaleString()}\` • Voice Time: \`${formatVoiceTime(stats.voiceMinutes)}\`\n` +
              `Role: ${vRole ? `<@&${vRole.roleId}>` : '`None yet (Lvl 1 required)`'}`,
            inline: false,
          },
          {
            name: '🏆 Overall Standing',
            value: `Combined XP: **\`${totalXp.toLocaleString()} XP\`** • Overall Rank: **\`${overallRankIdx >= 0 ? `#${overallRankIdx + 1}` : 'Unranked'}\`**`,
            inline: false,
          }
        )
        .setFooter({ text: `${interaction.guild.name} Leveling System` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return true;
    }

    if (commandName === 'leaderboard') {
      const category = interaction.options.getString('category') || 'overall';
      const payload = buildLeaderboardPayload(interaction.guild, dbData, category, cfg);
      await interaction.reply(payload);
      return true;
    }

    if (commandName === 'send-leaderboard') {
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      const payload = buildLeaderboardPayload(interaction.guild, dbData, 'overall', cfg);
      const sent = await targetChannel.send(payload);
      cfg.leaderboardChannelId = targetChannel.id;
      cfg.leaderboardMessageId = sent.id;
      saveLevelsConfig(cfg);
      await interaction.reply({
        content: `✅ Live Leaderboard deployed to ${targetChannel}!`,
        flags: 64,
      });
      return true;
    }

    if (commandName === 'setxp') {
      const targetUser = interaction.options.getUser('user');
      const type = interaction.options.getString('type');
      const amount = interaction.options.getInteger('amount');

      const stats = ensureUser(targetUser.id, targetUser.username);
      const oldLevel = type === 'text' ? stats.textLevel : stats.voiceLevel;
      const newLevel = getLevelFromXp(amount);

      if (type === 'text') {
        stats.textXp = amount;
        stats.textLevel = newLevel;
      } else {
        stats.voiceXp = amount;
        stats.voiceLevel = newLevel;
      }

      dirty = true;
      saveLocalData();

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      const unlocked = member ? await syncMemberRankRoles(member, type, newLevel) : null;
      if (member && newLevel > oldLevel) {
        await announceLevelUp(interaction.guild, member, type, oldLevel, newLevel, unlocked, stats);
      }
      await syncToDiscord(true);
      await updateLiveLeaderboard();

      const tierNow = getEligibleRole(newLevel, type === 'text' ? cfg.textRoles : cfg.voiceRoles);
      await interaction.reply({
        content:
          `✅ Updated **${type === 'text' ? 'Text Chat' : 'Voice'} XP** for <@${targetUser.id}> to **\`${amount.toLocaleString()} XP\`** (**Level ${newLevel}**).` +
          (tierNow ? `\n🎖️ Active ${type === 'text' ? 'Chat' : 'Voice'} Role: <@&${tierNow.roleId}>` : ''),
        flags: 64,
      });
      return true;
    }

    return false;
  }

  return {
    registerEvents,
    handleInteraction,
    syncToDiscord,
    updateLiveLeaderboard,
  };
}

module.exports = {
  levelingCommands,
  createLevelingSystem,
  xpForLevel,
  getLevelFromXp,
  buildProgressBar,
  formatVoiceTime,
  getEligibleRole,
  sortLeaderboard,
  buildLeaderboardPayload,
  loadLevelsConfig,
  saveLevelsConfig,
};
