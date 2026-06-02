@smoke @p0
Feature: E2E scaffold smoke test
  The harness can start the preview server, open a chromium context,
  and load the app. If this passes, the rest of the suite is runnable.

  Scenario: The kid home page loads in a real browser
    Given I am on the kid home page
    Then I see "SRS Kids"
