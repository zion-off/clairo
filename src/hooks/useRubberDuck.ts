import { useCallback, useEffect, useState } from 'react';
import { DuckEvent, duckEvents } from '../lib/duckEvents.js';

const DUCK_MESSAGES = [
  'Quack.',
  'Quack quack quack.',
  'Have you tried explaining it out loud?',
  "It's always DNS.",
  'Did you check the logs?',
  'Maybe add a console.log?',
  'Is it plugged in?',
  'Works on my machine.',
  'Have you tried reading the error message?',
  'I believe in you!',
  "It's probably a race condition.",
  'Have you tried turning it off and on again?',
  'Are you sure it compiled?',
  "It's not a bug, it's a feature.",
  'Did you clear the cache?',
  'Try deleting node_modules.',
  "That's quackers!",
  'Rubber duck debugging, activate!',
  '*supportive quacking*'
];

const REACTION_MESSAGES: Record<DuckEvent, string[]> = {
  'pr:merged': ['Quack! It shipped!', 'Merged!', 'To production we go!'],
  'pr:opened': ['A new PR! Exciting!', 'Time for review!', 'Fresh code incoming!'],
  'pr:reviewed': ['Feedback time!', 'Reviews are in!', '*attentive quacking*'],
  'pr:approved': ['Approved!', 'LGTM!', 'Ship it!'],
  'pr:changes-requested': ['Some changes needed...', 'Back to the drawing board!', 'Iterate iterate!'],
  error: ['Uh oh...', 'There there...', '*concerned quacking*', 'Quack... not good.'],
  'jira:transition': ['Ticket moving!', 'Progress!', 'Workflow in motion!'],
  'jira:linked': ['Ticket linked!', 'Jira connection made!', 'Tracking enabled!'],
  'jira:configured': ['Jira ready!', 'Integration complete!', 'Connected to Jira!']
};

type DuckState = {
  visible: boolean;
  message: string;
};

export function useRubberDuck() {
  const [state, setState] = useState<DuckState>({
    visible: false,
    message: DUCK_MESSAGES[0]!
  });

  const getRandomMessage = useCallback(() => {
    const index = Math.floor(Math.random() * DUCK_MESSAGES.length);
    return DUCK_MESSAGES[index]!;
  }, []);

  const toggleDuck = useCallback(() => {
    setState((prev) => ({
      ...prev,
      visible: !prev.visible,
      message: !prev.visible ? getRandomMessage() : prev.message
    }));
  }, [getRandomMessage]);

  const quack = useCallback(() => {
    if (state.visible) {
      setState((prev) => ({
        ...prev,
        message: getRandomMessage()
      }));
    }
  }, [state.visible, getRandomMessage]);

  const getReactionMessage = useCallback((event: DuckEvent) => {
    const messages = REACTION_MESSAGES[event];
    return messages[Math.floor(Math.random() * messages.length)]!;
  }, []);

  // Subscribe to duck events
  useEffect(() => {
    const unsubscribe = duckEvents.subscribe((event) => {
      setState((prev) => ({
        ...prev,
        visible: true,
        message: getReactionMessage(event)
      }));
    });
    return unsubscribe;
  }, [getReactionMessage]);

  return {
    visible: state.visible,
    message: state.message,
    toggleDuck,
    quack
  };
}
