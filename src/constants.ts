// Colors
export const DEFAULT_EMBED_COLOR = '#058c42' as const;

// Emojis
export const STAR_EMPTY = '<:starempty:1324131747851665489>';
export const STAR_RED = '<:starred:1324131708043395105>';
export const STAR_YELLOW = '<:staryellow:1324131656843395155>';
export const STAR_GREEN = '<:greenstar:1324131592808960090>';
export const STAR_EMOJI = '⭐';

// Max values
export const MAX_STARS = 5;
export const MAX_REVIEW_ROLES = 5;

// Text constants
export const BOT_NAME = 'Trustify';
export const BOT_VERSION = '2.0.0';
export const BOT_TAGLINE = 'Simplifying reviews';
export const DEFAULT_REVIEW_TITLE = 'New Review';
export const DEVELOPERS = [
  { name: 'Blaxedev', id: '918585597021548575' },
  { name: 'Solusdev', id: '953834900870557768' }
] as const;
export const DEFAULT_FOOTER = `${BOT_NAME} - ${BOT_TAGLINE}`;

// Error messages
export const ERRORS = {
  GUILD_ONLY: 'This command can only be used in a server.',
  NEEDS_SETUP: 'This server needs to be set up first. Ask an admin to use /setup',
  NO_REVIEW_CHANNEL: 'A review channel has not been set up. Ask an admin to set one using /setup',
  NOT_ALLOWED: 'You are not allowed to submit reviews.',
  NEEDS_ROLE: 'You need one of the required roles to submit reviews.',
  INVALID_CHANNEL: 'The configured review channel is invalid. Ask an admin to fix this using /setup',
  LOGS_TEXT_ONLY: 'The logs channel must be a text channel.',
  SETUP_FAILED: 'Failed to update server settings.'
} as const; 