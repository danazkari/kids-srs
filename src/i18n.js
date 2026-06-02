// Centralized user-facing strings. Localize by swapping values in this object.

export const STRINGS = {
  app: {
    name: 'SRS Kids',
    tagline: 'Learn and grow, one card at a time.'
  },
  kid: {
    home: {
      greeting: (name) => `Hi ${name}! 👋`,
      subtitle: 'Ready for a fun study session?',
      noDecks: 'No decks yet. Ask a grown-up to add some!',
      allDone: 'All done for today! 🌟',
      allDoneSub: 'Come back later for more practice.',
      badgesButton: 'My Badges',
      startSession: 'Start',
      allDoneCta: 'All done!',
      cardsDue: (n) => `${n} ${n === 1 ? 'card' : 'cards'} due`,
      newCards: (n) => `${n} new`,
      parentLink: 'For grown-ups'
    },
    session: {
      cardN: (i, n) => `Card ${i} of ${n}`,
      streak: (n) => `Streak: ${n}`,
      tapToSeeAnswer: 'Tap to see the answer',
      knewIt: 'I knew it!',
      almost: 'Almost!',
      notYet: 'Not yet',
      typeHere: 'Type the answer',
      submit: 'Check',
      next: 'Next',
      done: 'Done!',
      tryAgain: 'Try again',
      audioReplay: 'Play sound again',
      leaveConfirm: 'Leave this session?',
      leaveConfirmBody: 'You can come back later!',
      leaveConfirmYes: 'Leave',
      leaveConfirmNo: 'Keep going',
      doneTitle: 'Great job! 🎉',
      doneSub: (cards) => `You reviewed ${cards} ${cards === 1 ? 'card' : 'cards'}.`,
      doneHome: 'Back to home',
      spellingTryAgain: 'Try once more!',
      keepGoing: 'Keep going!',
      perfect: 'Perfect round! ✨',
      resumed: 'Welcome back! Let\'s keep going.'
    },
    badges: {
      title: 'My Badges',
      close: 'Close',
      earned: 'Earned',
      locked: '???'
    },
    errors: {
      storageUnavailable: "Please don't use private browsing mode so your progress can be saved!",
      noCards: 'No cards yet!'
    }
  },
  parent: {
    nav: {
      overview: 'Overview',
      decks: 'Decks',
      settings: 'Settings',
      exit: 'Exit parent mode',
      home: 'Kid home'
    },
    gate: {
      title: 'Grown-ups only',
      subtitle: 'Solve this to continue:',
      placeholder: '?',
      wrong: 'Try again!',
      lockedOut: 'Too many tries. Wait a moment.',
      correct: 'Great, you may pass!',
      back: 'Back to kid view'
    },
    overview: {
      title: 'Overview',
      range: { d7: 'Last 7 days', d30: 'Last 30 days', all: 'All time' },
      summary: {
        cards: 'Cards reviewed',
        sessions: 'Sessions',
        accuracy: 'Accuracy',
        streak: 'Current streak'
      },
      charts: {
        daily: 'Daily cards reviewed',
        accuracy: 'Accuracy over time',
        mastery: 'Cards by mastery',
        duration: 'Session duration',
        streak: 'Study streak',
        streakSub: 'Each square is a day. Darker = more sessions.',
        hardest: 'Hardest cards',
        badges: 'Badges earned',
        noAccuracy: 'No accuracy data yet — once your kid does some sessions, the chart will appear.'
      },
      mastery: { new: 'New', learning: 'Learning', mastered: 'Mastered', overdue: 'Overdue' },
      table: { deck: 'Deck', prompt: 'Prompt', lapses: 'Lapses', interval: 'Interval (days)' },
      noData: 'No data yet — complete a session to see your stats!'
    },
    decks: {
      title: 'Decks',
      addButton: 'Add deck',
      empty: 'No decks yet. Add a JSON file to get started.',
      filters: { all: 'All', active: 'Active', archived: 'Archived' },
      actions: { edit: 'Edit', download: 'Download', archive: 'Archive', unarchive: 'Unarchive', delete: 'Delete', replace: 'Replace cards' },
      create: {
        title: 'Add a new deck',
        drop: 'Drop a deck JSON file here, or click to choose',
        dropHint: 'You can find a sample in the docs.',
        submit: 'Upload deck',
        cancel: 'Cancel',
        errors: {
          invalidJson: 'That file isn\'t valid JSON.',
          missingName: 'The deck needs a name.',
          missingCards: 'The deck needs at least one card.',
          badCard: (i, msg) => `Card #${i + 1}: ${msg}`,
          largeImage: (size) => `Image is large (${Math.round(size / 1024)} KB). Consider using a URL.`,
          duplicate: 'A deck with this name already exists.'
        }
      },
      delete: {
        title: 'Delete this deck?',
        body: 'This will also delete all study progress for this deck. This cannot be undone.',
        yes: 'Yes, delete',
        no: 'Cancel'
      },
      replace: {
        title: 'Replace cards?',
        body: (summary) => `${summary.added} new, ${summary.removed} removed, ${summary.unchanged} unchanged. SRS progress will be reset for changed cards.`,
        yes: 'Replace',
        no: 'Cancel'
      },
      edit: {
        title: 'Edit deck',
        name: 'Name',
        language: 'Language (BCP-47)',
        tags: 'Tags (comma separated)',
        voice: 'Voice',
        sessionSize: 'Session size override (leave blank for global)',
        save: 'Save',
        cancel: 'Cancel',
        noVoice: 'No matching voice found for this language.'
      }
    },
    settings: {
      title: 'Settings',
      profile: { title: 'Profile', name: 'Kid\'s name' },
      keyboard: { title: 'Keyboard layout', qwerty: 'QWERTY', abc: 'ABC (alphabetical)' },
      session: {
        title: 'Session size (global defaults)',
        spelling: 'Spelling cards per session',
        phrase: 'Phrase cards per session',
        fact: 'Fact cards per session',
        audio: 'Audio cards per session'
      },
      audio: {
        title: 'Speech & audio',
        autoPlay: 'Auto-play pronunciation on flip',
        replayButton: 'Show replay button after flip',
        voiceHeading: 'Per-deck voice'
      },
      appearance: {
        title: 'Appearance',
        themeHeading: 'Theme',
        themeLight: 'Light',
        themeDark: 'Dark',
        themeSystem: 'Use system',
        accentHeading: 'Accent color',
        accentNames: {
          pink: 'Pink',
          purple: 'Purple',
          green: 'Green',
          blue: 'Blue',
          orange: 'Orange'
        }
      },
      save: 'Save settings',
      saved: 'Settings saved!'
    }
  }
};
