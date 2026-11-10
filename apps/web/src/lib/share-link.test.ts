import { describe, it, expect } from "vitest"
import { guideShareUrl } from "./share-link"

describe("guideShareUrl", () => {
  const expected = "https://capi.app/guias/gp1?utm_source=guia&utm_medium=social&utm_campaign=gp1"
  it("monta o link com UTMs", () => {
    expect(guideShareUrl("https://capi.app", "gp1")).toBe(expected)
  })
  it("não duplica a barra final da origem", () => {
    expect(guideShareUrl("https://capi.app/", "gp1")).toBe(expected)
  })
})
