@storage @p1
Feature: Storage and persistence
  The app persists state across reloads and creates a default
  profile on first run. Without these, every reload is a fresh
  install and the kid's progress is lost.

  Scenario: A default profile is auto-created on first run
    Given I have cleared the database
    When I am on the kid home page
    Then a profile exists in the database

  Scenario: The default profile persists across a reload
    Given I am on the kid home page
    When I reload the page
    Then a profile exists in the database
    And I see the kid home page

  Scenario: A theme setting persists across a reload
    Given I am on the parent "settings" tab
    And I have solved the parent gate
    When I switch the theme to "dark"
    And I reload the page
    Then the html element has a data-theme attribute
    And the theme is "dark"
