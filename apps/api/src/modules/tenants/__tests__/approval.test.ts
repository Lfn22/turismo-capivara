import { describe, it } from 'vitest'

describe('Tenant approval', () => {
  it.todo('PATCH /tenants/:id/approve by SUPER_ADMIN returns 200')
  it.todo('PATCH /tenants/:id/approve by ADMIN (non-SUPER_ADMIN) returns 403')
  it.todo('PATCH /tenants/:id/reject by SUPER_ADMIN with reason returns 200')
})
