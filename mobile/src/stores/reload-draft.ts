import { create } from 'zustand'

export type DraftChargePoint = {
  id: string
  name: string
  address: string | null
  source: 'partner' | 'ocm'
  powerKw: number | null
  pricePerKwhCents: number | null
}

type ReloadDraftStore = {
  chargePoint: DraftChargePoint | null
  setChargePoint: (chargePoint: DraftChargePoint) => void
  clear: () => void
}

/** Charge point chosen for the reload being registered (form ↔ picker ↔ sheet). */
export const useReloadDraft = create<ReloadDraftStore>((set) => ({
  chargePoint: null,
  setChargePoint: (chargePoint) => set({ chargePoint }),
  clear: () => set({ chargePoint: null }),
}))
