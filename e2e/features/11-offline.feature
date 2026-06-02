@offline @p1
Feature: Offline support
  The service worker precaches the app so a reload while offline
  still serves the app shell and lets the kid keep studying.

  Scenario: Reloading while offline serves the app from cache
    Given I am on the kid home page
    And the service worker has registered
    When I go offline
    And I reload the page
    Then I see the kid home page
