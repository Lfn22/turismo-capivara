// Equipe da plataforma: SUPER_ADMIN e PLATFORM_ADMIN
export function isPlatformStaff(role: string): boolean {
  return role === 'SUPER_ADMIN' || role === 'PLATFORM_ADMIN'
}
