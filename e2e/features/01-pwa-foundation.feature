@foundation @p0
Feature: PWA foundation
  The app is installable as a PWA, registers a service worker, and
  loads correctly on first paint. Without these, the offline experience
  and "add to home screen" affordance break.

  Scenario: The web app manifest is served at /manifest.webmanifest
    Given I am on the kid home page
    When I fetch the manifest
    Then the manifest has a non-empty name
    And the manifest has at least one icon
    And the manifest has a start_url

  Scenario: The service worker registers after first load
    Given I am on the kid home page
    Then a service worker is registered for the app scope

  Scenario: The html element has a data-theme attribute
    Given I am on the kid home page
    Then the html element has a data-theme attribute

  Scenario: Hash routes are reachable
    Given I am on the kid home page
    When I navigate to "#/parent/overview"
    Then the URL hash is "#/parent/overview"
    And I see the parent gate

  Scenario: An unknown hash route falls back to the kid home
    Given I am on the kid home page
    When I navigate to "#/no-such-route"
    Then I see "SRS Kids"
