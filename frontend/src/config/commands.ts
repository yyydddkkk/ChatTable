export const COMMANDS = [
  { name: 'clear', description: '清除聊天记录和上下文', usage: '/clear' },
  { name: 'help', description: '显示可用命令', usage: '/help' },
  { name: 'length', description: '设置回复长度 (1-5)', usage: '/length 3' },
] as const;

export type Command = typeof COMMANDS[number];
