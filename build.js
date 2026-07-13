const { execSync } = require('child_process');

try {
  console.log('--- Prisma generate ---');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('--- Prisma migrate deploy ---');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  console.log('--- Next build ---');
  execSync('npx next build', { stdio: 'inherit' });

  console.log('--- DONE ---');
} catch (err) {
  console.error('Erreur pendant le build:', err.message);
}