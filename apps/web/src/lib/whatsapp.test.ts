import { describe, expect, it } from "vitest"
import { normalizeWhatsapp } from "./whatsapp"

describe("normalizeWhatsapp", () => {
  it("vazio vira null (limpa o campo)", () => {
    expect(normalizeWhatsapp("   ")).toEqual({ value: null, error: null })
  })
  it("aceita número com DDD e máscara", () => {
    expect(normalizeWhatsapp(" (89) 99999-0000 ")).toEqual({ value: "(89) 99999-0000", error: null })
    expect(normalizeWhatsapp("+55 89 99999 0000").error).toBeNull()
  })
  it("rejeita poucos/muitos dígitos ou caracteres inválidos", () => {
    expect(normalizeWhatsapp("99999-000").error).not.toBeNull()
    expect(normalizeWhatsapp("+55 (89) 99999-00000").error).not.toBeNull()
    expect(normalizeWhatsapp("89 9999a-0000").error).not.toBeNull()
  })
})
