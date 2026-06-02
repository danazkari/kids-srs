@kid-session @p0
Feature: Kid study session
  The core learning loop: a kid starts a session, grades each card,
  and either finishes or leaves. Reloading mid-session should offer
  a resume; finishing should award the session-end badges.

  Background:
    Given I have cleared the database
    And I am on the kid home page

  Scenario: Starting a session shows the first card
    When I import and activate the "two-phrase-deck" deck
    And I am on the kid home page
    And I click the "Two phrase cards" deck
    Then I see "Card 1 of"

  Scenario: Reloading mid-session offers to resume
    When I import and activate the "two-phrase-deck" deck
    And I am on the session page for the "Two phrase cards" deck
    And I grade the phrase card as "I knew it"
    And I reload the page
    Then I see the resume modal
    When I click "Start fresh"
    Then I see "Card 1 of"

  Scenario: Clicking home during a session shows a leave confirm
    When I import and activate the "two-phrase-deck" deck
    And I am on the session page for the "Two phrase cards" deck
    And I click the leave button
    Then I see the leave confirm modal
    When I click "Keep going"
    Then I do not see the leave confirm modal

  Scenario: Spelling card: correct answer shows the next button
    When I import and activate the "spelling-deck" deck
    And I am on the session page for the "Spelling only" deck
    And I type "cat" and submit the spelling card
    Then I see the spelling card is correct
    And I see "Next"

  Scenario: Spelling card: wrong answer shows correction and try again
    When I import and activate the "spelling-deck" deck
    And I am on the session page for the "Spelling only" deck
    And I type "dog" and submit the spelling card
    Then I see the spelling card is wrong
    And I see "Try again"

  Scenario: Phrase card grade button advances
    When I import and activate the "two-phrase-deck" deck
    And I am on the session page for the "Two phrase cards" deck
    And I grade the phrase card as "I knew it"
    Then I see "Card 2 of 2"

  Scenario: Audio card grade button advances
    When I import and activate the "audio-deck" deck
    And I am on the session page for the "Audio only" deck
    And I grade the audio card as "I knew it"
    Then I see "Card 2 of 2"

  Scenario: Finishing a session shows the done screen
    When I import and activate the "two-phrase-deck" deck
    And I am on the session page for the "Two phrase cards" deck
    And I grade the phrase card as "I knew it"
    And I grade the phrase card as "I knew it"
    Then I see the done screen
    And the done screen shows "2" cards reviewed
