const REQUIRED_PRODUCTION = ['MONGO_URI', 'CLIENT_URL', 'GEMINI_API_KEY'];

function validateEnv(env = process.env, logger = console) {
  const errors = [];
  for (const name of REQUIRED_PRODUCTION) {
    if (typeof env[name] !== 'string' || env[name].trim() === '') errors.push(`Missing required environment variable: ${name}`);
  }
  if (typeof env.JWT_SECRET !== 'string' || env.JWT_SECRET.length === 0) {
    errors.push('Missing required environment variable: JWT_SECRET');
  } else if (env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }

  if (!errors.length) return true;
  if (env.NODE_ENV === 'production') throw new Error(`Invalid production environment: ${errors.join('; ')}`);
  for (const error of errors) logger.warn(`[environment] ${error}`);
  return false;
}

module.exports = { validateEnv };
