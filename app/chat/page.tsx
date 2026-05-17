import { ChatStream } from './ChatStream.client';

// 父级保持 SC，所有客户端能力下沉到 ChatStream 树。
export default function ChatPage() {
  return <ChatStream />;
}
