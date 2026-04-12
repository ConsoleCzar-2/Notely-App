/**
 * Auth Service User Store
 *
 * The Auth Service maintains a lightweight user credential store
 * (email → hashed password + userId). The canonical user profile
 * lives in the User Service (PostgreSQL). In production, Auth Service
 * would call User Service via internal API to validate credentials,
 * or share the same DB with strict read-only access.
 *
 * For this implementation we keep credentials here and profile in
 * User Service, which is a valid microservices pattern.
 */

const users = new Map(); // email → { userId, email, username, passwordHash }

const UserStore = {
  findByEmail: (email) => users.get(email.toLowerCase()) || null,

  findById: (userId) => {
    for (const user of users.values()) {
      if (user.userId === userId) return user;
    }
    return null;
  },

  create: ({ userId, email, username, passwordHash }) => {
    const user = { userId, email: email.toLowerCase(), username, passwordHash };
    users.set(email.toLowerCase(), user);
    return user;
  },

  exists: (email) => users.has(email.toLowerCase()),
};

module.exports = UserStore;
