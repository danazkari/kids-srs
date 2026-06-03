@timed-sessions @p1
Feature: Timed study sessions
  Kids can start timed study sessions. The timer is a gentle guide,
  not a source of stress — calm colors, pausable, finishes the
  current card before ending when time is up.

  Background:
    Given I have cleared the database

  # Settings
  Scenario: Parent enables timed sessions
    Given I am on the parent "settings" tab
    When I enable timed sessions
    And I add a "7" minute timer to the available options
    And I set the default timer to "7" minutes
    And I save the settings
    Then timed sessions are enabled with "7" as the default

  # Home page UI — multiple timers
  Scenario: Kid sees both Start and timer dropdown when multiple timers available
    Given I import and activate the "animals-senses.en-US" deck
    And timed sessions are enabled with options "(5, 10, 15)"
    And I am on the kid home page
    Then the "Senses & Animals" deck shows a "Start" button
    And the "Senses & Animals" deck shows a timer dropdown

  # Home page UI — single default timer
  Scenario: Kid sees single Start timer button when default is set
    Given I import and activate the "animals-senses.en-US" deck
    And timed sessions are enabled with only "5" minutes as default
    And I am on the kid home page
    Then the "Senses & Animals" deck shows a "5 min" timer button

  # Timer behavior
  Scenario: Timer counts down during session
    Given I import and activate the "animals-senses.en-US" deck
    And timed sessions are enabled with options "(5, 10, 15)"
    When I start a timed session for the "Senses & Animals" deck with "5" minutes
    Then I see a timer bar showing "5"
    When I grade the phrase card as "I knew it"
    Then the timer bar is visible

Scenario: Pause button pauses the timer
    Given timed sessions are enabled with options "(5, 10, 15)"
    When I start a timed session for the "Senses & Animals" deck with "5" minutes
    And I click the pause button
    Then the timer shows "(Paused)"
    When I click the pause button again
    Then the timer shows "5"

  Scenario: Timer pauses during leave confirm modal
    Given timed sessions are enabled with options "(5, 10, 15)"
    When I start a timed session for the "Senses & Animals" deck with "5" minutes
    And I click the leave button
    Then the timer shows "(Paused)"
    When I click "Keep going"
    Then the timer bar is visible

  # Session end
  Scenario: Session finishes current card when timer expires
    Given I import and activate the "animals-senses.en-US" deck
    And timed sessions are enabled with options "(1, 5, 10)"
    When I start a timed session for the "Senses & Animals" deck with "1" minute
    And I wait for the timer to expire
    And I complete the current card
    Then I see the done screen

  Scenario: Session record has timer metadata
    Given I import and activate the "animals-senses.en-US" deck
    And timed sessions are enabled with options "(5, 10, 15)"
    When I start a timed session for the "Senses & Animals" deck with "5" minutes
    And I grade the phrase card as "I knew it"
    And I advance through all remaining cards
    Then I see the done screen
    And the session record has timerMinutes set to "5"
    And the session record has endedByTimer set to "false"