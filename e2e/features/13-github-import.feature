@github-import @p1
Feature: Import decks from GitHub
  Parents can browse and import decks from any public GitHub repo
  by entering the owner/repo path. Already-imported decks show a
  re-import option to fetch the latest version.

  Background:
    Given I am on the parent "decks" tab

  Scenario: Repo not found shows error
    When I click the GitHub button in the decks section
    And I enter "nonexistent-user-123456/nonexistent-repo-789" in the repo input
    And I click "Fetch files"
    Then I see "Repo not found" error

  Scenario: Invalid format shows error
    When I click the GitHub button in the decks section
    And I enter "invalid-format" in the repo input
    And I click "Fetch files"
    Then I see "Invalid format" error

  Scenario: Fetch button is disabled when input is empty
    When I click the GitHub button in the decks section
    Then the "Fetch files" button is disabled