import type { RoomMessage } from '@/domain/undercover';
export function appendRoomMessage(messages: RoomMessage[], message: RoomMessage, roomId: string) {
  if (
    message.roomId !== roomId ||
    messages.some((m) => m.id === message.id && m.senderId === message.senderId)
  )
    return messages;
  return [...messages, message].slice(-300);
}
