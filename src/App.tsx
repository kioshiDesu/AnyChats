import { useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { SettingsModal } from './components/Settings';
import { Preview } from './components/Preview';
import { FileEditor } from './components/FileEditor';
import { useStore } from './store/useStore';

export default function App() {
  const isDarkMode = useStore((state) => state.isDarkMode);
  const setIsOffline = useStore((state) => state.setIsOffline);
  const setOllamaStatus = useStore((state) => state.setOllamaStatus);
  const localEndpoint = useStore((state) => state.localEndpoint);
  const apiMode = useStore((state) => state.apiMode);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOffline]);

  useEffect(() => {
    if (apiMode !== 'local') return;

    const checkOllama = async () => {
      try {
        setOllamaStatus('checking');
        const response = await fetch(`${localEndpoint}/api/tags`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        if (response.ok) {
          setOllamaStatus('online');
        } else {
          setOllamaStatus('offline');
        }
      } catch (e) {
        setOllamaStatus('offline');
      }
    };
    
    checkOllama();
    const interval = setInterval(checkOllama, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [apiMode, localEndpoint, setOllamaStatus]);

  const conversations = useStore((state) => state.conversations);
  const currentConversationId = useStore((state) => state.currentConversationId);
  const createConversation = useStore((state) => state.createConversation);

  useEffect(() => {
    // If there are no conversations at all (first time user), or no conversation is selected, create/select one
    if (conversations.length === 0) {
      createConversation();
    } else if (!currentConversationId && conversations.length > 0) {
      // Actually, if they just haven't selected one, maybe we select the first one, or we just let them stay on the welcome screen.
      // But the prompt says "First start should automatically get new conversation instead of manually tapping new conversation when first time user."
      // So if length === 0, we create one.
    }
  }, [conversations.length, currentConversationId, createConversation]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Gesture-based navigation for mobile
  const touchStartX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].screenX;
    const startX = touchStartX.current;
    
    const swipeThreshold = 50;
    const isSidebarOpen = useStore.getState().isSidebarOpen;
    const setSidebarOpen = useStore.getState().setSidebarOpen;

    if (touchEndX < startX - swipeThreshold) {
      // Swiped left - close sidebar
      if (isSidebarOpen) setSidebarOpen(false);
    }
    
    if (touchEndX > startX + swipeThreshold) {
      // Swiped right - open sidebar if we started from the left edge
      if (!isSidebarOpen && startX < 30) {
         setSidebarOpen(true);
      }
    }
  };

  return (
    <div 
      className="flex h-[100dvh] w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Sidebar />
      <Chat />
      <SettingsModal />
      <Preview />
      <FileEditor />
    </div>
  );
}