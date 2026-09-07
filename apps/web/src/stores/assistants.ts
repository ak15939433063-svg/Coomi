import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authedFetch } from '@/bridge/http'

async function parseRes(res: Response): Promise<any> {
  const text = await res.text()
  let data: any = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = {} }
  if (!res.ok) {
    const detail = data.error ?? data.message ?? ''
    throw new Error(detail || `HTTP ${res.status}`)
  }
  return data
}

export interface AssistantRecord {
  id: string
  name: string
  avatar?: string | null
  persona: string
  providerId?: string | null
  model?: string | null
  temperature?: number | null
  topP?: number | null
  maxTokens?: number | null
  reasoningLevel?: string
  useAssistantAvatarInChat?: boolean
  systemPrompt?: string
  messageTemplate?: string
  presetMessages?: Array<{ role: string; content: string }>
  regexRules?: Array<{ id: string; name: string; enabled: boolean; pattern: string; replacement: string; scope: string }>
  extensions: {
    promptInjectionIds?: string[]
    lorebookIds?: string[]
    enabledSkills?: string[]
    quickMessages?: Array<{ id: string; title: string; content: string }>
  }
  memory: {
    enabled?: boolean
    useGlobalMemory?: boolean
    enableRecentChatsReference?: boolean
    enableTimeReminder?: boolean
    items?: Array<{ id: number; content: string }>
  }
  customRequest: {
    headers?: Array<{ name: string; value: string }>
    bodyParams?: Record<string, unknown>
  }
  mcpServerIds?: string[]
  localTools: { jsEngine?: boolean }
}

export function blankAssistant(): AssistantRecord {
  return {
    id: '',
    name: '',
    avatar: null,
    persona: '',
    providerId: null,
    model: null,
    temperature: null,
    topP: null,
    maxTokens: null,
    reasoningLevel: 'auto',
    useAssistantAvatarInChat: false,
    systemPrompt: '',
    messageTemplate: '{{ message }}',
    presetMessages: [],
    regexRules: [],
    extensions: {
      promptInjectionIds: [],
      lorebookIds: [],
      enabledSkills: [],
      quickMessages: [],
    },
    memory: {
      enabled: false,
      useGlobalMemory: false,
      enableRecentChatsReference: false,
      enableTimeReminder: false,
      items: [],
    },
    customRequest: {
      headers: [],
      bodyParams: {},
    },
    mcpServerIds: [],
    localTools: { jsEngine: false },
  }
}

export const useAssistantsStore = defineStore('assistants', () => {
  const items = ref<AssistantRecord[]>([])
  const activeId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref('')
  const notice = ref('')

  async function fetchList() {
    loading.value = true
    error.value = ''
    try {
      const res = await authedFetch('/api/assistants')
      const data = await parseRes(res)
      items.value = data.assistants ?? []
      activeId.value = data.active ?? null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function fetchOne(id: string): Promise<AssistantRecord | null> {
    loading.value = true
    error.value = ''
    try {
      const res = await authedFetch(`/api/assistants/${id}`)
      const data = await parseRes(res)
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function saveAssistant(record: AssistantRecord): Promise<boolean> {
    loading.value = true
    error.value = ''
    try {
      const isNew = !record.id
      const url = isNew ? '/api/assistants' : `/api/assistants/${record.id}`
      const res = await authedFetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
      const data = await parseRes(res)
      if (data.id) record.id = data.id
      await fetchList()
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteAssistant(id: string): Promise<boolean> {
    loading.value = true
    error.value = ''
    try {
      const res = await authedFetch(`/api/assistants/${id}`, { method: 'DELETE' })
      await parseRes(res)
      await fetchList()
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      loading.value = false
    }
  }

  async function activateAssistant(id: string): Promise<boolean> {
    error.value = ''
    try {
      const res = await authedFetch(`/api/assistants/${id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      await parseRes(res)
      activeId.value = id
      await fetchList()
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return false
    }
  }

  return {
    items,
    activeId,
    loading,
    error,
    notice,
    fetchList,
    fetchOne,
    saveAssistant,
    deleteAssistant,
    activateAssistant,
  }
})
