export const AgentProvider = {
  Kimi: 'kimi',
  Anthropic: 'anthropic',
  OpenAI: 'openai',
  Ollama: 'ollama',
} as const
export type AgentProvider = typeof AgentProvider[keyof typeof AgentProvider]

export interface Agent {
  id: string
  name: string
  role: string
  provider: AgentProvider
  model: string
  temperature: number
  toolsCount: number
  createdAt: string
}
