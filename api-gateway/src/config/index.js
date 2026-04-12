module.exports = {
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
    user: process.env.USER_SERVICE_URL || 'http://localhost:4002',
    notes: process.env.NOTES_SERVICE_URL || 'http://localhost:4003',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_in_prod',
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,                  // requests per window
  },
};
