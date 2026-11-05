"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { toast } from "sonner"
import { Alert, Button, Input, PageHeader, Skeleton } from "@/src/components/ui/capi"
import { AvatarPicker } from "@/src/components/ui/AvatarPicker"
import { editCall, errorText } from "@/lib/edit-client"

interface Account {
  id: string
  name: string
  email: string
  role: string
  photoUrl: string | null
  tenant: { id: string; slug: string; name: string; logoUrl: string | null; type: string } | null
}

const proxy = (path: string) => `/api/proxy?path=${encodeURIComponent(path)}`

export function ContaClient() {
  const router = useRouter()
  const { update } = useSession()
  const [account, setAccount] = useState<Account | null>(null)
  const [loadError, setLoadError] = useState(false)

  const [name, setName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)

  const [newEmail, setNewEmail] = useState("")
  const [emailPassword, setEmailPassword] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [savingEmail, setSavingEmail] = useState(false)
  // Etapa 2: código enviado para o novo e-mail
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [emailCode, setEmailCode] = useState("")
  const [resendingCode, setResendingCode] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    editCall("GET", proxy("/account/me")).then(({ ok, data }) => {
      if (!ok || !data) return setLoadError(true)
      setAccount(data)
      setName(data.name ?? "")
    }).catch(() => setLoadError(true))
  }, [])

  // Nome/foto mudaram: atualiza a sessão (UserBar) e os componentes de servidor (sidebar do painel)
  async function refreshSession(data: Account) {
    setAccount(data)
    await update()
    router.refresh()
  }

  async function savePhoto(photoUrl: string | null) {
    const { ok, data } = await editCall("PATCH", proxy("/account/me"), { photoUrl })
    if (!ok) throw new Error(errorText(data, "Não foi possível salvar a foto."))
    await refreshSession(data)
    toast.success(photoUrl ? "Foto atualizada." : "Foto removida.")
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2 || trimmed.length > 100) {
      setNameError("O nome deve ter entre 2 e 100 caracteres.")
      return
    }
    setNameError(null)
    setSavingName(true)
    try {
      const { ok, data } = await editCall("PATCH", proxy("/account/me"), { name: trimmed })
      if (!ok) return setNameError(errorText(data, "Não foi possível salvar o nome."))
      setName(data.name)
      await refreshSession(data)
      toast.success("Nome atualizado.")
    } catch {
      setNameError("Erro de conexão. Tente novamente.")
    } finally {
      setSavingName(false)
    }
  }

  async function requestEmailCode(email: string): Promise<boolean> {
    const { ok, data } = await editCall("POST", proxy("/account/email"), { password: emailPassword, newEmail: email })
    if (!ok) {
      setEmailError(errorText(data, "Não foi possível alterar o e-mail."))
      return false
    }
    setPendingEmail(data?.pendingEmail ?? email)
    return true
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault()
    const email = newEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setEmailError("Informe um e-mail válido.")
    if (email === account?.email) return setEmailError("Este já é o seu e-mail atual.")
    if (!emailPassword) return setEmailError("Informe sua senha para confirmar.")
    setEmailError(null)
    setSavingEmail(true)
    try {
      if (await requestEmailCode(email)) {
        setEmailCode("")
        toast.success("Enviamos um código de 6 dígitos para o novo e-mail.")
      }
    } catch {
      setEmailError("Erro de conexão. Tente novamente.")
    } finally {
      setSavingEmail(false)
    }
  }

  async function resendEmailCode() {
    if (!pendingEmail) return
    setEmailError(null)
    setResendingCode(true)
    try {
      if (await requestEmailCode(pendingEmail)) toast.success("Código reenviado.")
    } catch {
      setEmailError("Erro de conexão. Tente novamente.")
    } finally {
      setResendingCode(false)
    }
  }

  async function confirmEmail(e: React.FormEvent) {
    e.preventDefault()
    const code = emailCode.trim()
    if (!/^\d{6}$/.test(code)) return setEmailError("Informe o código de 6 dígitos.")
    setEmailError(null)
    setSavingEmail(true)
    try {
      const { ok, data } = await editCall("POST", proxy("/account/email/confirm"), { code })
      if (!ok) return setEmailError(errorText(data, "Código inválido ou expirado."))
      toast.success("E-mail alterado. Entre novamente com o novo e-mail.")
      await signOut({ callbackUrl: "/login?aviso=email" })
    } catch {
      setEmailError("Erro de conexão. Tente novamente.")
    } finally {
      setSavingEmail(false)
    }
  }

  function cancelEmailChange() {
    setPendingEmail(null)
    setEmailCode("")
    setEmailError(null)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword) return setPasswordError("Informe a senha atual.")
    if (newPassword.length < 8) return setPasswordError("A nova senha deve ter pelo menos 8 caracteres.")
    if (newPassword !== confirmPassword) return setPasswordError("A confirmação não confere com a nova senha.")
    setPasswordError(null)
    setSavingPassword(true)
    try {
      const { ok, data } = await editCall("POST", proxy("/account/password"), { currentPassword, newPassword })
      if (!ok) return setPasswordError(errorText(data, "Não foi possível alterar a senha."))
      toast.success("Senha alterada. Entre novamente com a nova senha.")
      await signOut({ callbackUrl: "/login?aviso=senha" })
    } catch {
      setPasswordError("Erro de conexão. Tente novamente.")
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <>
      <style precedence="default">{`
        .conta-section { display: flex; flex-direction: column; gap: var(--space-4); padding-block: var(--space-6); border-top: 1px solid var(--border); font-family: var(--font-sans); }
        .conta-title { margin: 0; font-size: 18px; font-weight: 600; line-height: 1.35; color: var(--text); }
        .conta-desc { margin: 0; font-size: 14px; line-height: 1.5; color: var(--text-secondary); overflow-wrap: anywhere; }
        .conta-actions { display: flex; justify-content: flex-end; }
        @media (max-width: 639px) { .conta-actions .capi-btn { flex: 1; } }
      `}</style>

      <PageHeader eyebrow="Conta" title="Minha conta" description="Sua foto, nome, e-mail e senha de acesso." />

      {loadError ? (
        <Alert tone="danger" title="Não foi possível carregar sua conta">
          Recarregue a página para tentar de novo.
        </Alert>
      ) : !account ? (
        <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Skeleton width={80} height={80} radius={999} />
          <Skeleton height={48} radius={12} />
          <Skeleton height={48} radius={12} />
        </div>
      ) : (
        <>
          <section className="conta-section" aria-labelledby="conta-perfil">
            <h2 id="conta-perfil" className="conta-title">Foto e nome</h2>
            <AvatarPicker
              name={account.name}
              src={account.photoUrl}
              folder={account.role === "CONDUTOR" ? "guides" : "avatars"}
              onChange={savePhoto}
            />
            <form onSubmit={saveName} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <Input
                label="Nome"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                error={nameError}
              />
              <div className="conta-actions">
                <Button type="submit" loading={savingName} disabled={name.trim() === account.name}>
                  Salvar nome
                </Button>
              </div>
            </form>
          </section>

          <section className="conta-section" aria-labelledby="conta-email">
            <div>
              <h2 id="conta-email" className="conta-title">E-mail</h2>
              <p className="conta-desc">
                Atual: <strong>{account.email}</strong>. Enviaremos um código para o novo endereço. Depois de confirmar, você precisará entrar de novo.
              </p>
            </div>
            {pendingEmail ? (
              <form onSubmit={confirmEmail} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <p className="conta-desc">
                  Enviamos um código de 6 dígitos para <strong>{pendingEmail}</strong>. Ele vale por 15 minutos.
                </p>
                <Input
                  label="Código de verificação"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                  error={emailError}
                />
                <div className="conta-actions" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <Button type="button" variant="ghost" onClick={cancelEmailChange} disabled={savingEmail || resendingCode}>
                    Cancelar
                  </Button>
                  <Button type="button" variant="ghost" onClick={resendEmailCode} loading={resendingCode} disabled={savingEmail}>
                    Reenviar código
                  </Button>
                  <Button type="submit" variant="secondary" loading={savingEmail} disabled={resendingCode}>
                    Confirmar e-mail
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={saveEmail} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <Input
                  label="Novo e-mail"
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <Input
                  label="Senha atual"
                  type="password"
                  autoComplete="current-password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  error={emailError}
                />
                <div className="conta-actions">
                  <Button type="submit" variant="secondary" loading={savingEmail}>
                    Enviar código
                  </Button>
                </div>
              </form>
            )}
          </section>

          <section className="conta-section" aria-labelledby="conta-senha">
            <div>
              <h2 id="conta-senha" className="conta-title">Senha</h2>
              <p className="conta-desc">Depois de trocar, você precisará entrar de novo em todos os dispositivos.</p>
            </div>
            <form onSubmit={savePassword} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <Input
                label="Senha atual"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Input
                label="Nova senha"
                type="password"
                autoComplete="new-password"
                hint="Mínimo de 8 caracteres."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                label="Confirmar nova senha"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={passwordError}
              />
              <div className="conta-actions">
                <Button type="submit" variant="secondary" loading={savingPassword}>
                  Trocar senha
                </Button>
              </div>
            </form>
          </section>
        </>
      )}
    </>
  )
}
