@data-integrity @p0
Feature: Deck import data integrity
  The parent can import decks from JSON files. Invalid files are
  rejected with a clear error; valid files produce a usable deck.
  These tests cover the unhappy paths first because a bad import
  silently corrupting progress would be a top-tier bug.

  Background:
    Given I have cleared the database
    And I am on the parent "decks" tab
    And I have solved the parent gate

  Scenario Outline: Importing a malformed deck shows an error
    When I open the add deck modal
    And I import the deck file "<file>"
    Then I see an error containing "<message>"
    And the deck is not in the deck list

    Examples:
      | file                  | message                          |
      | not-json.txt          | is not valid json                |
      | empty-object.json     | Missing deck name                |
      | missing-cards.json    | at least one card                |
      | duplicate-ids.json    | duplicate id                     |
      | invalid-type.json     | type must be one of              |
      | missing-answer.json   | missing answer                   |
      | missing-id.json       | missing id                       |

  Scenario: Importing a valid deck adds it to the deck list
    When I open the add deck modal
    And I import the deck file "valid-deck.json"
    Then I see the deck preview
    When I click "Upload deck"
    Then the deck "Valid test deck" is in the deck list
    And the deck "Valid test deck" is available on the kid home

  Scenario: Importing a deck with a large image shows a warning
    When I open the add deck modal
    And I import the deck file "large-image.json"
    Then I see a warning
