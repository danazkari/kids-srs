@badges @p1
Feature: Badges
  Badges are awarded at the end of a session. The badge modal only
  shows at session end, never mid-session. A perfect session gets
  a special badge.

  Background:
    Given I have cleared the database

  Scenario: First card badge is awarded after the first graded card
    When I import and activate the "two-phrase-deck" deck
    And I am on the session page for the "Two phrase cards" deck
    And I grade the phrase card as "I knew it"
    And I grade the phrase card as "I knew it"
    Then I see the done screen
    And I navigate to "#/"
    And I open the badges modal
    Then I see "First Step!"

  Scenario: Perfect session badge is awarded when all cards are correct
    When I import and activate the "two-phrase-deck" deck
    And I am on the session page for the "Two phrase cards" deck
    And I grade the phrase card as "I knew it"
    And I grade the phrase card as "I knew it"
    Then I see the done screen
    And I see "Perfect Round!"
