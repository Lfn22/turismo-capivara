// Testa o endpoint de upload de fotos
import { writeFileSync } from 'fs'

const API = 'http://localhost:3333'

async function main() {
  // 1. Login
  console.log('=== 1. LOGIN ===')
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'superadmin@capi.turismo',
      password: 'superadmin123',
      tenantSlug: 'capi-platform',
    }),
  })
  if (!loginRes.ok) { console.log('Erro login:', await loginRes.text()); return }
  const { token } = await loginRes.json()
  console.log('Token:', token ? '✓' : '✗ AUSENTE')

  // 2. Criar uma imagem mínima válida (PNG 1x1 pixel)
  const pngPixel = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000000200' +
    '0000000e1fd0490000000049454e44ae426082',
    'hex'
  )
  writeFileSync('C:/tmp/test.png', pngPixel)

  // 3. Testar upload para destinations
  console.log('\n=== 2. POST /uploads/photos?folder=destinations ===')
  const formData = new FormData()
  const blob = new Blob([pngPixel], { type: 'image/png' })
  formData.append('file', blob, 'test.png')

  const uploadRes = await fetch(`${API}/uploads/photos?folder=destinations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  console.log('Status:', uploadRes.status)
  const uploadBody = await uploadRes.text()
  console.log('Resposta:', uploadBody)

  // 4. Testar upload para packages
  console.log('\n=== 3. POST /uploads/photos?folder=packages ===')
  const formData2 = new FormData()
  const blob2 = new Blob([pngPixel], { type: 'image/png' })
  formData2.append('file', blob2, 'test.png')

  const uploadRes2 = await fetch(`${API}/uploads/photos?folder=packages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData2,
  })
  console.log('Status:', uploadRes2.status)
  const uploadBody2 = await uploadRes2.text()
  console.log('Resposta:', uploadBody2)
}

main().catch(err => {
  if (err.cause?.code === 'ECONNREFUSED') {
    console.error('API não está rodando em', API)
  } else {
    console.error('Erro inesperado:', err)
  }
})
