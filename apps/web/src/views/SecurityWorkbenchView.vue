<script setup lang="ts">
/**
 * 信息渗透独立工作台。
 *
 * 首版目标：
 * 1. 给出独立的目标/任务输入区，不混进普通聊天。
 * 2. 按能力域列出可用工具组，点击后向当前 MCP 会话发送工具调用。
 * 3. 展示 StrykerOSS 已识别但暂未接线的能力清单，避免做成“有按钮无实现”的空壳。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authedFetch } from '@/bridge/http'
import PageHead from '@/components/PageHead.vue'
import CoomiIcon from '@/components/CoomiIcon.vue'

const router = useRouter()

type ToolGroup = {
  id: string
  label: string
  desc: string
  tools: string[]
}

const groups = ref<ToolGroup[]>([
  {
    id: 'recon',
    label: '网络侦察',
    desc: '目标枚举、端点发现、页面信息收集',
    tools: [
      'network_list',
      'network_get',
      're_find_endpoints',
      're_find_api',
      're_find_sensitive_api',
      'page_inspect',
      'page_security',
    ],
  },
  {
    id: 'dynamic',
    label: '动态调试与 Hook',
    desc: '脚本调试、混淆检测、运行时跟踪',
    tools: [
      'js_parse_ast',
      'js_detect_obfuscation',
      'js_deobfuscate',
      'debugger_attach',
      'debugger_set_breakpoint',
      'hook_function',
      'hook_fetch',
      'hook_xhr',
    ],
  },
  {
    id: 'terminal',
    label: '终端与工作区',
    desc: '沙箱终端、文件操作、证据归档',
    tools: [
      'terminal_exec',
      'terminal_run_script',
      'file_read',
      'file_write',
      'file_tree',
      'workspace_create',
      'workspace_add_finding',
    ],
  },
])

const target = ref('')
const task = ref('')
const busyTool = ref<string | null>(null)
const notice = ref('')
const mcpStatus = ref<'loading' | 'ready' | 'unavailable'>('loading')
const mcpToolCount = ref(0)

/** 本机已安装/启用 MCP 的状态，确认 webreverse 是否可用。 */
async function refreshMcpStatus() {
  mcpStatus.value = 'loading'
  notice.value = ''
  try {
    const res = await authedFetch('/api/catalog')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const servers = (data.mcp ?? []) as Array<{ id: string; enabled?: boolean }>
    const enabled = servers.filter(item => item.enabled)
    mcpToolCount.value = enabled.length
    mcpStatus.value = enabled.some(item => item.id === 'webreverse') ? 'ready' : 'unavailable'
  } catch (error) {
    mcpStatus.value = 'unavailable'
    notice.value = `MCP 状态读取失败：${error instanceof Error ? error.message : String(error)}`
  }
}

/** 向当前会话发送一个 MCP 工具调用。 */
function runTool(name: string) {
  if (!target.value.trim() && !task.value.trim()) {
    notice.value = '先填写目标或任务，再选择工具'
    return
  }
  busyTool.value = name
  notice.value = ''
  // 首版不直接伪造引擎命令；通过会话消息交给当前 Agent 调度，避免绕过审批和工具链。
  const prompt = [
    '信息渗透工作台任务',
    target.value ? `目标：${target.value.trim()}` : '',
    task.value ? `任务：${task.value.trim()}` : '',
    `优先使用 MCP 工具：${name}`,
  ].filter(Boolean).join('\n')

  // 这里保留后续接入 session.sendMessage 的挂载点；
  // 当前先展示将要投递的指令，工程上不允许未接通就假装执行成功。
  notice.value = `已准备工具调用「${name}」\n${prompt}`
  busyTool.value = null
}

onMounted(refreshMcpStatus)

const mcpReady = computed(() => mcpStatus.value === 'ready')

function goDashboard() {
  if (window.CoomiAndroid?.openDashboard) window.CoomiAndroid.openDashboard()
  else router.push('/')
}
</script>

<template>
  <div class="page">
    <PageHead title="信息渗透工作台" @back="goDashboard" />
    <main class="body">
      <section class="mission">
        <div class="mission-head">
          <span class="status" :class="mcpStatus">
            <CoomiIcon name="plug" :size="14" />
            {{ mcpStatus === 'loading' ? '检测 MCP…' : mcpReady ? 'webreverse 已就绪' : 'webreverse 未启用' }}
          </span>
          <button class="mini" type="button" @click="refreshMcpStatus">刷新状态</button>
        </div>

        <label class="field">
          <span class="label">目标</span>
          <input
            v-model="target"
            type="text"
            placeholder="域名 / IP / URL / 资产范围"
            autocomplete="off"
            spellcheck="false"
          />
        </label>
        <label class="field">
          <span class="label">任务描述</span>
          <textarea
            v-model="task"
            rows="4"
            placeholder="例如：枚举子域与开放端口，标记可匿名访问的接口"
            spellcheck="false"
          />
        </label>
      </section>

      <p v-if="notice" class="hint">{{ notice }}</p>

      <section v-for="group in groups" :key="group.id" class="group">
        <div class="group-head">
          <h2>{{ group.label }}</h2>
          <p>{{ group.desc }}</p>
        </div>
        <div class="tool-grid">
          <button
            v-for="tool in group.tools"
            :key="tool"
            class="tool"
            :disabled="!mcpReady || busyTool === tool"
            @click="runTool(tool)"
          >
            <CoomiIcon name="bolt" :size="14" />
            <code>{{ tool }}</code>
          </button>
        </div>
      </section>

      <section class="group pending">
        <div class="group-head">
          <h2>StrykerOSS 能力迁入清单</h2>
          <p>已拆解识别，待接入后端执行层后再开放按钮</p>
        </div>
        <ul>
          <li>本地网络邻居 / 主机 / 端口 / 服务发现</li>
          <li>HID / Ducky 注入与 payload 编辑</li>
          <li>Nuclei 扫描</li>
          <li>Hydra 暴破</li>
          <li>Metasploit 安装桥</li>
          <li>Cameradar 摄像头探测</li>
          <li>WiFi / 蓝牙 FastPair 分析</li>
          <li>USB 无线网卡芯片识别</li>
          <li>GeoMAC 与 MAC 变更</li>
        </ul>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; background: var(--page); }
.body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 14px calc(var(--safe-bottom) + 28px); -webkit-overflow-scrolling: touch; }
.mission { padding: 16px; border-radius: var(--r-card); background: var(--bg); box-shadow: var(--shadow-1); }
.mission-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 10px; }
.status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 650; color: var(--text-2); }
.status.ready { color: var(--ok); }
.status.unavailable { color: var(--danger); }
.status.loading { color: var(--text-3); }
.mini { height: 30px; padding: 0 11px; border-radius: var(--r-pill); background: var(--fill-strong); color: var(--text-2); font-size: 11.5px; font-weight: 600; transition: background 0.15s, transform 0.08s; }
.mini:active { background: var(--fill-press); transform: scale(0.96); }
.field { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.field:first-of-type { margin-top: 0; }
.label { padding-left: 4px; font-size: 12px; color: var(--text-2); }
.field input, .field textarea { width: 100%; border: 1.5px solid var(--border); border-radius: var(--r-md); background: var(--bg-input); color: var(--text); font-size: 14px; padding: 12px 13px; outline: none; resize: vertical; transition: border-color 0.16s, box-shadow 0.16s; }
.field input:focus, .field textarea:focus { border-color: var(--blue-border); box-shadow: 0 0 0 3px var(--blue-soft); }
.hint { margin: 12px 4px 0; padding: 10px 12px; border-radius: var(--r-md); background: var(--fill); color: var(--text-2); font-size: 12px; line-height: 1.55; white-space: pre-wrap; }
.group { margin-top: 14px; padding: 16px; border-radius: var(--r-card); background: var(--bg); box-shadow: var(--shadow-1); animation: coomi-cascade 0.22s cubic-bezier(0.22, 0.68, 0.19, 1) both; }
.group-head h2 { margin: 0; font-size: 14.5px; font-weight: 650; color: var(--text); }
.group-head p { margin: 3px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--text-3); }
.tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
.tool { display: flex; align-items: center; gap: 6px; min-width: 0; height: 42px; padding: 0 10px; border-radius: var(--r-md); background: var(--fill-strong); color: var(--text); font-size: 11.5px; text-align: left; transition: background 0.15s, transform 0.08s; }
.tool code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-mono); font-size: 10.5px; white-space: nowrap; }
.tool:active:not(:disabled) { background: var(--fill-press); transform: scale(0.97); }
.tool:disabled { opacity: 0.5; }
.pending ul { margin: 10px 0 0 18px; padding: 0; font-size: 12px; line-height: 1.8; color: var(--text-2); }
</style>
