/** Options SSL pour PostgreSQL — Render (externe) et autres hébergeurs. */
module.exports = function pgSslOptions(connectionString) {
  const url = connectionString || process.env.DATABASE_URL || "";
  if (/render\.com|sslmode=require|ssl=true/i.test(url)) {
    return { rejectUnauthorized: false };
  }
  return undefined;
};
