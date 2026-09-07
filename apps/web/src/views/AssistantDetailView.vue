<script setup lang="ts">
/**
 * 自定义助手详情（七页签）。
 * 首版保持可用：基础字段直接绑定；列表类字段用 JSON/逗号文本编辑，保存时解析回后端结构。
 */
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAssistantsStore, blankAssistant, type AssistantRecord } from '@/stores/assistants'
import PageHead from '@/components/PageHead.vue'
import CoomiIcon from '@/components/CoomiIcon.vue'

const route = useRoute()
const router = useRouter()
const assistants = useAssistantsStore()
const id = String(route.params.id ?? '')

const record = ref<AssistantRecord>(blankAssistant())
const activeTab = ref<'basic' | 'prompt' | 'extensions' | 'memory' | 'request' | 'mcp' | 'localTools'>('basic')
const saving = ref(false)
const saved = ref(false)
const error = ref('')

const skillsText = ref('')
const mcpIdsText = ref('')
const quickMessagesText = ref('[]')
const regexText = ref('[]')
const memoryItemsText = ref('[]')
const headersText = ref('[]')
const bodyParamsText = ref('{}')

function syncTextsFromRecord() {
  skillsText.value = (record.value.extensions?.enabledSkills ?? []).join(', ')
  mcpIdsText.value = (record.value.mcpServerIds ?? []).join(', ')
  quickMessagesText.value = JSON.stringify(record.value.extensions?.quickMessages ?? [], null, 2)
  regexText.value = JSON.stringify(record.value.regexRules ?? [], null, 2)
  memoryItemsText.value = JSON.stringify(record.value.memory?.items ?? [], null, 2)
  headersText.value = JSON.stringify(record.value.customRequest?.headers ?? [], null, 2)
  bodyParamsText.value = JSON.stringify(record.value.customRequest?.bodyParams ?? {}, null, 2)
}

function parseJsonArray(text: string, fallback: unknown[] = []): unknown[] {
  const raw = text.trim()
  if (!raw) return fallback
  try {
    const value = JSON.parse(raw)
    return Array.isArray(value) ? value : fallback
  } catch {
    return fallback
  }
}

function parseJsonObject(text: string, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  const raw = text.trim()
  if (!raw) return fallback
  try {
    const value = JSON.parse(raw)
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : fallback
  } catch {
    return fallback
  }
}

function syncRecordFromTexts() {
  const exts = record.value.extensions ?? {}
  exts.enabledSkills = skillsText.value.split(/[,，]/).map(item => item.trim()).filter(Boolean)
  exts.quickMessages = parseJsonArray(quickMessagesText.value) as Array<{ id: string; title: string; content: string }>
  record.value.extensions = exts
  record.value.regexRules = parseJsonArray(regexText.value) as AssistantRecord['regexRules']
  record.value.mcpServerIds = mcpIdsText.value.split(/[,，]/).map(item => item.trim()).filter(Boolean)
  const memory = record.value.memory ?? {}
  memory.items = parseJsonArray(memoryItemsText.value) as Array<{ id: number; content: string }>
  record.value.memory = memory
  const request = record.value.customRequest ?? {}
  request.headers = parseJsonArray(headersText.value) as Array<{ name: string; value: string }>
  request.bodyParams = parseJsonObject(bodyParamsText.value) as Record<string, unknown>
  record.value.customRequest = request
}

async function load() {
  const data = await assistants.fetchOne(id)
  if (!data) {
    error.value = '未找到该助手'
    return
  }
  const merged = blankAssistant()
  Object.assign(merged, data)
  if (data.memory) Object.assign(merged.memory, data.memory)
  if (data.extensions) Object.assign(merged.extensions, data.extensions)
  if (data.customRequest) Object.assign(merged.customRequest, data.customRequest)
  if (data.localTools) Object.assign(merged.localTools, data.localTools)
  record.value = merged
  syncTextsFromRecord()
}

async function save() {
  if (saving.value) return
  saving.value = true
  saved.value = false
  error.value = ''
  syncRecordFromTexts()
  const ok = await assistants.saveAssistant(record.value)
  saving.value = false
  if (ok) {
    saved.value = true
    syncTextsFromRecord()
  } else {
    error.value = assistants.error || '保存失败'
  }
}

function goBack() {
  router.push('/assistants')
}

onMounted(load)
</script>

<template>
  <div class="page">
    <PageHead title="助手设置" @back="goBack" />
    <main class="body">
      <div class="tabs" role="tablist">
        <button v-for="tab in [
          { id: 'basic', label: '基础设定' },
          { id: 'prompt', label: '提示词' },
          { id: 'extensions', label: '扩展管理' },
          { id: 'memory', label: '记忆' },
          { id: 'request', label: '自定义请求' },
          { id: 'mcp', label: 'MCP' },
          { id: 'localTools', label: '本地工具' },
        ] as const" :key="tab.id" class="tab" :class="{ on: activeTab === tab.id }" @click="activeTab = tab.id">
          {{ tab.label }}
        </button>
      </div>

      <p v-if="error" class="notice err">{{ error }}</p>
      <p v-else-if="saved" class="notice ok">已保存</p>

      <section v-if="activeTab === 'basic'" class="group">
        <label class="field"><span>配置名称</span><input v-model="record.name" type="text" /></label>
        <label class="field"><span>头像（URL 或 emoji）</span><input v-model="record.avatar" type="text" /></label>
        <label class="field"><span>人设（最多 20000 字符）</span><textarea v-model="record.persona" rows="8" :maxlength="20000" /></label>
        <div class="grid">
          <label class="field"><span>模型</span><input v-model="record.model" type="text" placeholder="留空使用全局模型" /></label>
          <label class="field"><span>提供商 ID</span><input v-model="record.providerId" type="text" placeholder="留空使用全局模型" /></label>
        </div>
        <div class="grid">
          <label class="field"><span>temperature</span><input v-model.number="record.temperature" type="number" step="0.1" /></label>
          <label class="field"><span>topP</span><input v-model.number="record.topP" type="number" step="0.1" /></label>
          <label class="field"><span>maxTokens</span><input v-model.number="record.maxTokens" type="number" /></label>
        </div>
        <label class="field"><span>推理强度</span><input v-model="record.reasoningLevel" type="text" placeholder="auto/low/medium/high/xhigh" /></label>
        <label class="check"><input v-model="record.useAssistantAvatarInChat" type="checkbox" /> 在聊天中使用助手头像和名字</label>
      </section>

      <section v-else-if="activeTab === 'prompt'" class="group">
        <label class="field"><span>系统提示</span><textarea v-model="record.systemPrompt" rows="8" /></label>
        <label class="field"><span>消息模板</span><input v-model="record.messageTemplate" type="text" placeholder="{{ message }}" /></label>
        <label class="field"><span>正则规则（JSON 数组）</span><textarea v-model="regexText" rows="6" /></label>
      </section>

      <section v-else-if="activeTab === 'extensions'" class="group">
        <label class="field"><span>启用 Skills（逗号分隔）</span><textarea v-model="skillsText" rows="3" /></label>
        <label class="field"><span>快速消息（JSON 数组）</span><textarea v-model="quickMessagesText" rows="6" /></label>
      </section>

      <section v-else-if="activeTab === 'memory'" class="group">
        <label class="check"><input v-model="record.memory.enabled" type="checkbox" /> 启用记忆</label>
        <label class="check"><input v-model="record.memory.useGlobalMemory" type="checkbox" /> 全局记忆</label>
        <label class="check"><input v-model="record.memory.enableRecentChatsReference" type="checkbox" /> 参考历史聊天记录</label>
        <label class="check"><input v-model="record.memory.enableTimeReminder" type="checkbox" /> 时间提醒</label>
        <label class="field"><span>管理记忆（JSON 数组）</span><textarea v-model="memoryItemsText" rows="6" /></label>
      </section>

      <section v-else-if="activeTab === 'request'" class="group">
        <label class="field"><span>自定义请求头（JSON 数组）</span><textarea v-model="headersText" rows="6" /></label>
        <label class="field"><span>自定义正文参数（JSON 对象）</span><textarea v-model="bodyParamsText" rows="6" /></label>
      </section>

      <section v-else-if="activeTab === 'mcp'" class="group">
        <label class="field"><span>MCP Server ID（逗号分隔）</span><textarea v-model="mcpIdsText" rows="4" /></label>
      </section>

      <section v-else class="group">
        <label class="check"><input v-model="record.localTools.jsEngine" type="checkbox" /> 启用本地 JavaScript 引擎</label>
      </section>

      <div class="actions">
        <button class="ghost" type="button" @click="goBack">返回</button>
        <button class="primary" type="button" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; background: var(--page); }
.body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 14px calc(var(--safe-bottom) + 28px); -webkit-overflow-scrolling: touch; }
.tabs { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 14px; padding-bottom: 2px; scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab { flex: 0 0 auto; height: 36px; padding: 0 14px; border-radius: var(--r-pill); background: var(--fill-strong); color: var(--text-2); font-size: 12.8px; font-weight: 600; transition: background 0.16s, color 0.16s, transform 0.08s; }
.tab:active { transform: scale(0.97); }
.tab.on { background: var(--blue-soft); color: var(--blue); }
.notice { margin: 0 0 12px; padding: 9px 12px; border-radius: var(--r-md); font-size: 12.5px; }
.notice.err { background: var(--danger-soft, #ffeceb); color: var(--danger, #d43d2e); }
.notice.ok { background: var(--ok-soft, #e6f4ea); color: var(--ok, #2e9e5b); }
.group { padding: 16px; border-radius: var(--r-card); background: var(--bg); box-shadow: var(--shadow-1); animation: coomi-cascade 0.22s cubic-bezier(0.22, 0.68, 0.19, 1) both; }
.field { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; font-size: 12.5px; color: var(--text-2); }
.field:first-of-type { margin-top: 0; }
.field span { padding-left: 4px; font-size: 12px; color: var(--text-3); }
.field input, .field textarea { width: 100%; border: 1.5px solid var(--border); border-radius: var(--r-md); background: var(--bg-input); color: var(--text); font-size: 14px; padding: 12px 13px; outline: none; resize: vertical; transition: border-color 0.16s, box-shadow 0.16s; }
.field input:focus, .field textarea:focus { border-color: var(--blue-border); box-shadow: 0 0 0 3px var(--blue-soft); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
.check { display: flex; align-items: center; gap: 9px; min-height: 44px; margin-top: 12px; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--r-md); background: var(--fill); font-size: 13px; color: var(--text); transition: border-color 0.16s, background 0.16s; }
.check input { width: 17px; height: 17px; accent-color: var(--blue); }
.check:active { background: var(--fill-press); }
.actions { display: flex; gap: 10px; margin-top: 20px; }
.actions button { flex: 1; height: 46px; border-radius: var(--r-md); font-size: 14.5px; font-weight: 650; transition: background 0.16s, transform 0.08s; }
.actions button:active { transform: scale(0.985); }
.primary { background: var(--blue); color: #fff; box-shadow: 0 4px 14px rgba(45, 97, 198, 0.18); }
.primary:active { background: var(--blue-press); }
.ghost { background: var(--fill-strong); color: var(--text); }
.ghost:active { background: var(--fill-press); }
.primary:disabled { opacity: 0.55; }
</style>
