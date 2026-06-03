@session-resume-bug @p0
Feature: Session resume bug — zero session size trap
  When a parent sets all session-size caps to 0 in Settings, the
  buildSessionQueue returns an empty queue even though the deck has
  cards. The user gets "All done for today" and cannot start a session.
  The fix: when all caps are 0, fall back to DEFAULT_SESSION_SIZE so
  the queue is never artificially empty.

  Background:
    Given I have cleared the database
    And I am on the kid home page

  Scenario: Zero session sizes should not produce an empty queue
    When I import and activate the "animals-senses.en-US" deck
    And I go to the parent settings and set all session sizes to 0
    And I save the settings
    And I navigate to the session for the "Senses & Animals" deck
    Then I see a study card
    And I do not see "All done for today"