import * as testFile from '../test-data/retryStrategyTestData.json';
import {executeScenario, RetryTestCase} from '../conformanceCommon';

const SCENARIO_NUMBER_TO_TEST = 5;
const retryTestCase: RetryTestCase | undefined =
  testFile.retryStrategyTests.find(test => test.id === SCENARIO_NUMBER_TO_TEST);

if (retryTestCase) {
  describe(`Scenario ${SCENARIO_NUMBER_TO_TEST}`, () => {
    executeScenario(retryTestCase);
  });
}
