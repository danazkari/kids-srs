@github-import @p1
Feature: Import decks from GitHub

  Background:
    Given I have cleared the database
    And I am on the parent "settings" tab

  # --- Custom input mode (no saved repos) ---

  Scenario: Repo not found shows error
    # Override Background: need to be on decks tab, not settings
    Given I am on the parent "decks" tab
    When I click the GitHub button in the decks section
    Then the GitHub modal shows "No repositories saved"
    When I enter "nonexistent-user-123456/nonexistent-repo-789" in the repo input
    And I click "Fetch files"
    Then I see "Repo not found" error

  Scenario: Invalid format shows error
    Given I am on the parent "decks" tab
    When I click the GitHub button in the decks section
    Then the GitHub modal shows "No repositories saved"
    When I enter "invalid-format" in the repo input
    And I click "Fetch files"
    Then I see "Invalid format" error

  Scenario: Add repo button in GitHub modal opens add form when no repos saved
    Given I am on the parent "decks" tab
    When I click the GitHub button in the decks section
    Then the GitHub modal shows "No repositories saved"
    When I click the + Add button in the GitHub modal to add a repository
    Then the GitHub modal shows a repository name input
    And the GitHub modal shows a repository URL input

  # --- Repo selector dropdown (multiple saved repos) ---

  Scenario: GitHub modal shows repo selector dropdown when multiple repos exist
    When I add a repository with name "Official Decks" and repo "myuser/decks1"
    And I add a repository with name "My Cards" and repo "myuser/decks2"
    And I am on the parent "decks" tab
    When I click the GitHub button in the decks section
    Then the GitHub modal shows the repo dropdown
    And the "Official Decks" repo is pre-selected

  Scenario: GitHub modal skips dropdown when only one repo exists
    When I add a repository with name "Official Decks" and repo "myuser/my-decks"
    And I am on the parent "decks" tab
    When I click the GitHub button in the decks section
    Then the GitHub modal does not show a repo dropdown
    And the GitHub modal shows "from Official Decks"

  # --- Settings: Deck Repositories management ---
  # Background already on Settings — no extra Given step needed

  @deck-repos
  Scenario: Parent can add a repository in Settings
    When I add a repository with name "My Cards" and repo "myuser/my-decks"
    Then the repository list shows "My Cards"

  @deck-repos
  Scenario: Parent can edit a repository's name and URL
    When I add a repository with name "My Cards" and repo "myuser/my-decks"
    And I edit the repository to name "Science Pack" and repo "myuser/science"
    Then the repository list shows "Science Pack" with repo "myuser/science"

  @deck-repos
  Scenario: Parent can remove a repository
    When I add a repository with name "My Cards" and repo "myuser/my-decks"
    And I remove the repository "My Cards"
    Then the repository list no longer shows "My Cards"

  @deck-repos
  Scenario: Parent can set a repository as default
    When I add a repository with name "Official Decks" and repo "myuser/decks1"
    And I add a repository with name "My Cards" and repo "myuser/decks2"
    And I set "My Cards" as the default repository
    Then "My Cards" is marked as the default repository