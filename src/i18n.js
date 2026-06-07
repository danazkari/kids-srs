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
      tapToSeeAnswer: 'Tap to see the answer',
      knewIt: 'I knew it!',
      almost: 'Almost!',
      notYet: 'Not yet',
      typeHere: 'Type the answer',
      submit: 'Check',
      next: 'Next',
      done: 'Done!',
      audioReplay: 'Play sound again',
      leaveConfirm: 'Leave this session?',
      leaveConfirmBody: 'You can come back later!',
      leaveConfirmYes: 'Leave',
      leaveConfirmNo: 'Keep going',
      doneTitle: 'Great job! 🎉',
      doneSub: (cards) => `You reviewed ${cards} ${cards === 1 ? 'card' : 'cards'}.`,
      doneHome: 'Back to home',
      keepGoing: 'Keep going!',
      perfect: 'Perfect round! ✨',
      resumed: "Welcome back! Let's keep going.",
      paused: 'Paused',
      timerExpired: "Time's up!",
      moreCardsComing: 'More cards on the way! 🎉',
      restartIn: 'restarting in'
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
        noAccuracy:
          'No accuracy data yet — once your kid does some sessions, the chart will appear.'
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
      actions: {
        edit: 'Edit',
        download: 'Download',
        archive: 'Archive',
        unarchive: 'Unarchive',
        delete: 'Delete',
        replace: 'Replace cards'
      },
      create: {
        title: 'Add a new deck',
        drop: 'Drop a deck JSON file here, or click to choose',
        dropHint: 'You can find a sample in the docs.',
        submit: 'Upload deck',
        cancel: 'Cancel',
        errors: {
          invalidJson: "That file isn't valid JSON.",
          missingName: 'The deck needs a name.',
          missingCards: 'The deck needs at least one card.',
          badCard: (i, msg) => `Card #${i + 1}: ${msg}`,
          largeImage: (size) =>
            `Image is large (${Math.round(size / 1024)} KB). Consider using a URL.`,
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
        body: (summary) =>
          `${summary.added} new, ${summary.removed} removed, ${summary.unchanged} unchanged. Unchanged cards keep their progress; new cards start fresh.`,
        yes: 'Replace',
        no: 'Cancel'
      },
      githubImport: {
        title: 'Import from GitHub',
        repoPlaceholder: 'owner/repo or owner/repo:path',
        fetchFiles: 'Fetch files',
        fetching: 'Loading...',
        noJsonFiles: 'No .json files found at this path.',
        reImport: 'Re-import',
        alreadyImported: 'Imported',
        cardsCount: (n) => `${n} ${n === 1 ? 'card' : 'cards'}`,
        importButton: (n) => `Import ${n} ${n === 1 ? 'deck' : 'decks'}`,
        fromRepo: 'from',
        noRepos: 'No repositories saved.',
        addRepoInSettings: 'Add a repository in Settings',
        addRepoButton: '+ Add',
        selectRepo: 'Select repository',
        errors: {
          repoNotFound: 'Repo not found — check the owner/repo spelling.',
          rateLimited: 'GitHub rate limit reached. Try again in a few minutes.',
          networkError: "Couldn't reach GitHub. Check your connection.",
          invalidFormat: 'Invalid format. Use owner/repo or owner/repo:path',
          fetchFailed: 'Failed to fetch files. Check the repo and path.'
        }
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
      profile: { title: 'Profile', name: "Kid's name" },
      keyboard: { title: 'Keyboard layout', qwerty: 'QWERTY', abc: 'ABC (alphabetical)' },
      session: {
        title: 'Session size (global defaults)',
        spelling: 'Spelling cards per session',
        phrase: 'Phrase cards per session',
        fact: 'Fact cards per session',
        audio: 'Audio cards per session'
      },
      timedSession: {
        title: 'Timed sessions',
        enable: 'Enable timed sessions',
        availableTimers: 'Available timers (minutes)',
        addTimer: 'Add',
        removeTimer: 'Remove',
        defaultTimer: 'Default timer',
        none: 'None',
        minMinutes: 'min 1 minute'
      },
      audio: {
        title: 'Speech & audio',
        autoPlay: 'Auto-play pronunciation on flip',
        replayButton: 'Show replay button after flip',
        voiceHeading: 'Per-deck voice'
      },
      deckRepos: {
        title: 'Deck repositories',
        empty: 'No repositories saved.',
        addButton: 'Add repository',
        namePlaceholder: 'Nickname (e.g. "Official Decks")',
        repoPlaceholder: 'owner/repo or owner/repo:path',
        editButton: 'Edit',
        removeButton: 'Remove',
        setDefaultButton: 'Set as default',
        defaultLabel: 'default',
        importFromRepo: 'Importing from',
        addSubmit: 'Save',
        addCancel: 'Cancel',
        errors: {
          nameRequired: 'Please enter a nickname.',
          repoInvalid: 'Invalid format. Use owner/repo or owner/repo:path'
        }
      },
      save: 'Save settings',
      saved: 'Settings saved!'
    }
  }
};
