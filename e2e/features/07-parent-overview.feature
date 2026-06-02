@parent-overview @p1
Feature: Parent overview dashboard
  The parent overview shows summary cards and a mastery chart driven
  by SRS data. Empty state and mutually exclusive buckets are the
  high-risk paths.

  Background:
    Given I have cleared the database
    And I am on the parent "overview" tab
    And I have solved the parent gate

  Scenario: Empty state is shown when there are no sessions
    Then I see "No data yet"
    And the summary card "Cards reviewed" shows "0"

  Scenario: After a session, the summary cards reflect it
    When I import and activate the "two-phrase-deck" deck
    And I am on the kid home page
    And I am on the session page for the "Two phrase cards" deck
    And I grade the phrase card as "I knew it"
    And I grade the phrase card as "I knew it"
    Then I see the done screen
    When I am on the parent "overview" tab
    Then the summary card "Cards reviewed" shows "2"
    And the summary card "Sessions" shows "1"

  Scenario: Mastery buckets are mutually exclusive
    When I have a deck with mastered and overdue cards
    And I am on the parent "overview" tab
    Then the mastery total equals the srs state count
