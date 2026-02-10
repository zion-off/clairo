import { useCallback, useEffect, useState } from 'react';
import { DUCK_MESSAGES, pickReactionMessage } from '../constants/duck.js';
import { loadConfig, saveConfig } from '../lib/config/index.js';
import { duckEvents } from '../lib/duckEvents.js';

type DuckState = {
  visible: boolean;
  message: string;
};

export function useRubberDuck() {
  const [state, setState] = useState<DuckState>(() => {
    const config = loadConfig();
    return {
      visible: config.duckVisible ?? false,
      message: DUCK_MESSAGES[Math.floor(Math.random() * DUCK_MESSAGES.length)]!
    };
  });

  const getRandomMessage = useCallback(() => {
    const index = Math.floor(Math.random() * DUCK_MESSAGES.length);
    return DUCK_MESSAGES[index]!;
  }, []);

  const toggleDuck = useCallback(() => {
    setState((prev) => {
      const newVisible = !prev.visible;
      const config = loadConfig();
      saveConfig({ ...config, duckVisible: newVisible });
      return {
        ...prev,
        visible: newVisible,
        message: newVisible ? getRandomMessage() : prev.message
      };
    });
  }, [getRandomMessage]);

  const quack = useCallback(() => {
    if (state.visible) {
      setState((prev) => ({
        ...prev,
        message: getRandomMessage()
      }));
    }
  }, [state.visible, getRandomMessage]);

  // Subscribe to duck events
  useEffect(() => {
    const unsubscribe = duckEvents.subscribe((event, payload) => {
      setState((prev) => ({
        ...prev,
        visible: true,
        message: pickReactionMessage(event, payload)
      }));
    });
    return unsubscribe;
  }, []);

  return {
    visible: state.visible,
    message: state.message,
    toggleDuck,
    quack
  };
}
