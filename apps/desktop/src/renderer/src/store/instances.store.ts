import { create } from 'zustand'

interface InstancesState {
  selectedInstanceId: string | null
  searchQuery: string
  setSelectedInstanceId: (id: string | null) => void
  setSearchQuery: (query: string) => void
}

export const useInstancesStore = create<InstancesState>((set) => ({
  selectedInstanceId: null,
  searchQuery: '',
  setSelectedInstanceId: (id) => set({ selectedInstanceId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
