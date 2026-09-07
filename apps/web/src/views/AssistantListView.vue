<script setup lang="ts">
/**
 * 自定义助手列表。
 * 从这里创建、切换、编辑、删除助手；入口来自设置页“自定义助手设置”。
 */
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAssistantsStore, blankAssistant } from '@/stores/assistants'
import PageHead from '@/components/PageHead.vue'
import CoomiIcon from '@/components/CoomiIcon.vue'

const router = useRouter()
const assistants = useAssistantsStore()

onMounted(() => {
  void assistants.fetchList()
})

async function createAssistant() {
  const record = blankAssistant()
  record.name = '自定义助手'
  const ok = await assistants.saveAssistant(record)
  if (ok && record.id) await router.push(`/assistants/${record.id}`)
}

function openAssistant(id: string) {
  void router.push(`/assistants/${id}`)
}

async function activate(id: string) {
  await assistants.activateAssistant(id)
}

async function removeAssistant(id: string) {
  if (!window.confirm('确认删除该助手？此操作不可恢复。')) return
  await assistants.deleteAssistant(id)
}

function goBack() {
  if (window.CoomiAndroid?.openDashboard) window.CoomiAndroid.openDashboard()
  else router.push('/settings')
}
</script>

<template>
  <div class="page">
    <PageHead title="自定义助手" @back="goBack" />
    <main class="body">
      <div class="toolbar">
        <button class="primary" type="button" @click="createAssistant">
          <CoomiIcon name="plusCircle" :size="16" />新建助手
        </button>
      </div>

      <p v-if="assistants.loading" class="hint">加载中…</p>
      <p v-else-if="assistants.error" class="hint err">{{ assistants.error }}</p>
      <p v-else-if="assistants.items.length === 0" class="hint">还没有自定义助手，先新建一个。</p>

      <div v-else class="cards">
        <div v-for="item in assistants.items" :key="item.id" class="card">
          <button class="card-main" @click="openAssistant(item.id)">
            <span class="tile" :class="{ on: assistants.activeId === item.id }">
              <CoomiIcon name="sparkle" :size="18" />
            </span>
            <span class="meta">
              <span class="name">{{ item.name || '未命名助手' }}</span>
              <span class="sub">{{ item.model || '使用全局模型' }} · {{ item.persona ? '已配置人设' : '未配置人设' }}</span>
            </span>
            <span v-if="assistants.activeId === item.id" class="badge">当前</span>
            <CoomiIcon name="chevronRight" :size="16" class="chev" />
          </button>
          <div class="ops">
            <button v-if="assistants.activeId !== item.id" class="mini" type="button" @click="activate(item.id)">启用</button>
            <button class="mini danger" type="button" @click="removeAssistant(item.id)">删除</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; background: var(--page); }
.body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 14px calc(var(--safe-bottom) + 28px); -webkit-overflow-scrolling: touch; }
.toolbar { display: flex; justify-content: flex-end; margin-bottom: 14px; }
.primary {
  display: inline-flex; align-items: center; gap: 7px;
  height: 42px; padding: 0 16px; border-radius: var(--r-pill);
  background: var(--blue); color: #fff; font-size: 13.5px; font-weight: 650;
  box-shadow: 0 4px 14px rgba(45, 97, 198, 0.18);
  transition: background 0.16s, transform 0.08s, box-shadow 0.16s;
}
.primary:active { background: var(--blue-press); transform: scale(0.97); box-shadow: 0 2px 8px rgba(45, 97, 198, 0.16); }
.hint { margin: 18px 0; text-align: center; font-size: 13px; color: var(--text-3); }
.hint.err { color: var(--danger, #d43d2e); }
.cards { display: flex; flex-direction: column; gap: 10px; }
.card {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 13px; border-radius: var(--r-card);
  background: var(--bg); box-shadow: var(--shadow-1);
  transition: transform 0.16s cubic-bezier(0.22, 0.68, 0.19, 1), box-shadow 0.16s;
  animation: coomi-cascade 0.22s cubic-bezier(0.22, 0.68, 0.19, 1) both;
}
.card:active { transform: scale(0.995); box-shadow: var(--shadow-2); }
.card-main { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; padding: 0; border: 0; background: none; text-align: left; }
.tile { flex-shrink: 0; width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; background: var(--fill-strong); color: var(--text-2); transition: background 0.16s, color 0.16s; }
.tile.on { background: var(--blue-soft); color: var(--blue); }
.meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.name { font-size: 14.5px; font-weight: 650; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub { font-size: 11.5px; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { flex-shrink: 0; padding: 3px 9px; border-radius: var(--r-pill); background: var(--ok-soft, #e6f4ea); color: var(--ok, #2e9e5b); font-size: 10.5px; font-weight: 650; }
.chev { flex-shrink: 0; color: var(--text-3); }
.ops { display: flex; gap: 8px; }
.mini { height: 32px; padding: 0 12px; border-radius: var(--r-pill); background: var(--fill-strong); color: var(--text-2); font-size: 12px; font-weight: 650; transition: background 0.15s, transform 0.08s; }
.mini:active { background: var(--fill-press); transform: scale(0.96); }
.mini.danger { background: var(--danger-soft, #ffeceb); color: var(--danger, #d43d2e); }
</style>
