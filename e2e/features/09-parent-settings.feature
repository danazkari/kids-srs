@parent-settings @p1
Feature: Parent settings
  The parent can change the kid's name, theme, accent, and per-deck
  voice. All settings persist across reloads.

  Background:
    Given I have cleared the database
    And I am on the parent "settings" tab
    And I have solved the parent gate

  Scenario: Profile name change persists across reload
    When I change the kid's name to "Mira"
    And I click "Save settings"
    Then I see "Settings saved!"
    And I reload the page
    Then the kid's name is "Mira"

  Scenario: Accent change persists across reload
    When I switch the accent to "purple"
    And I reload the page
    Then the html element has a data-accent attribute
    And the accent is "purple"
