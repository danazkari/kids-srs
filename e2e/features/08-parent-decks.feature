@parent-decks @p1
Feature: Parent deck management
  The parent can replace, archive, and delete decks. The kid's view
  must stay consistent: archived decks disappear, deleted decks clean
  up SRS state, and replaced cards preserve progress for unchanged ids.

  Background:
    Given I have cleared the database
    And I am on the parent "decks" tab
    And I have solved the parent gate

  Scenario: Archive hides the deck from the kid home
    When I import and activate the "valid-deck" deck
    And I archive the "Valid test deck" deck
    And I filter the deck list to "Active"
    Then the deck "Valid test deck" is not in the deck list
    And the deck "Valid test deck" is not in the kid deck list

  Scenario: Unarchive restores the deck to the kid home
    When I import and activate the "valid-deck" deck
    And I archive the "Valid test deck" deck
    And I unarchive the "Valid test deck" deck
    Then the deck "Valid test deck" is in the deck list
    And the deck "Valid test deck" is available on the kid home

  Scenario: Delete removes the deck and all its data
    When I import and activate the "valid-deck" deck
    And I delete the "Valid test deck" deck
    Then the deck "Valid test deck" is not in the deck list
    And the srs state for "Valid test deck" is empty
