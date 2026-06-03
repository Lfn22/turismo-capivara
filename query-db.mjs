import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Client } = require('./apps/api/node_modules/pg/lib/index.js');

const c = new Client({ connectionString: 'postgresql://postgres:czTumzjEIHcJaIoSvOpNqRkTXMYbhEMd@zephyr.proxy.rlwy.net:58116/railway' });
await c.connect();

const tenants = await c.query('SELECT id, slug, name FROM "Tenant" LIMIT 5');
console.log('TENANTS:');
console.table(tenants.rows);

const slots = await c.query(`
  SELECT ds.id, ds.status, ds.capacity, ds.booked, t.slug AS tenant_slug
  FROM "DepartureSlot" ds
  JOIN "Tenant" t ON ds."tenantId" = t.id
  WHERE ds.status = 'OPEN'
  LIMIT 5
`);
console.log('OPEN SLOTS:');
console.table(slots.rows);

await c.end();
