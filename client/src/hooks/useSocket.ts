import { useEffect } from 'react';
import { getSocket } from '../api/socket';
import { useAuthStore } from '../stores/authStore';

export function useSocket() {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user) {
      const socket = getSocket();
      socket.emit('join', user.id);

      socket.on('data-update', (data: { module: string; action: string; id: string }) => {
        console.log('Data update received:', data);
        // Dispatch custom event for components to listen
        window.dispatchEvent(new CustomEvent('socket-data-update', { detail: data }));
      });

      return () => {
        socket.off('data-update');
      };
    }
  }, [user]);
}

export function useSocketEvent(module: string, callback: (data: any) => void) {
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const data = event.detail;
      if (data.module === module) {
        callback(data);
      }
    };

    window.addEventListener('socket-data-update', handler as EventListener);
    return () => {
      window.removeEventListener('socket-data-update', handler as EventListener);
    };
  }, [module, callback]);
}

export function emitSocketEvent(module: string, action: string, id: string) {
  const socket = getSocket();
  socket.emit('data-update', { module, action, id });
}
