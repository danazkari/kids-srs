@regressions @p0
Feature: Session regressions
  These scenarios lock in fixes for bugs that previously slipped past
  the unit tests because they only manifested during a real session.

  Background:
    Given I have cleared the database

  Scenario: Streak counter is not visible during a session
    When I import and activate the "spelling-deck" deck
    And I am on the session page for the "Spelling only" deck
    Then I do not see "Streak:"

  Scenario: No badge modal pops up after the first card
    When I import and activate the "two-phrase-deck" deck
    And I am on the session page for the "Two phrase cards" deck
    And I grade the phrase card as "I knew it"
    Then I do not see "First Step!"

  Scenario: Grade button advances to the next card
    When I import and activate the "two-phrase-deck" deck
    And I am on the session page for the "Two phrase cards" deck
    And I grade the phrase card as "Almost"
    Then I see "Card 2 of 2"

  Scenario: Kid can start a new session after abandoning one on the same day
    When I import and activate the "two-phrase-deck" deck
    And I am on the kid home page
    And I click the "Two phrase cards" deck
    And I grade the phrase card as "I knew it"
    And I click the leave button
    And I see the leave confirm modal
    And I click "Leave"
    And I click the "Two phrase cards" deck
    Then I do not see "All done for today!"
    And I see a study card

  Scenario: Completed session starts fresh without prompting
    When I import and activate the "two-phrase-deck" deck
    And I am on the kid home page
    And I click the "Two phrase cards" deck
    And I grade the phrase card as "I knew it"
    And I advance through all remaining cards
    Then I see the done screen
    When I click the done screen home button
    And I start a session for the "Two phrase cards" deck
    Then I do not see the resume modal
    And I see a study card
