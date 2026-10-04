import { loadEnvFile } from 'node:process';
loadEnvFile();
import {
  OrkesClients,
  ConductorWorkflow,
  TaskHandler,
  Task,
  worker,
  simpleTask,
  switchTask,
  doWhileTask,
} from '@io-orkes/conductor-javascript';

const orkesConfig = {
  serverUrl: process.env.SERVER_URL,
  keyId: process.env.KEY_ID,
  keySecret: process.env.KEY_SECRET,
};

// worker is defined with an associated task
// worker is polling the workflow for when the workflow needs the task
class ConductorWorkers {
  @worker({ taskDefName: 'greet' })
  async greet(task: Task) {
    const name = task.inputData?.name || 'New User';
    return {
      status: 'COMPLETED' as const,
      outputData: {
        result: name,
      },
    };
  }
  @worker({ taskDefName: 'loggedIn' })
  async loggedIn(task: Task) {
    // This is a stub for calling an API to check logged in status
    // If they are logged out, check the username, then get the status from the username task
    const isLoggedIn =
      task.inputData?.loggedIn === true || Math.round(Math.random());
    return {
      status: 'COMPLETED' as const,
      outputData: {
        result: Boolean(isLoggedIn),
      },
    };
  }
  @worker({ taskDefName: 'locale' })
  async locale(task: Task) {
    // Mock asynchronous API call for the locale
    const locale = await Promise.resolve('en-us');
    return {
      status: 'COMPLETED' as const,
      outputData: {
        result: locale,
      },
    };
  }
  @worker({ taskDefName: 'userName' })
  // Only use this if they are not logged in initially
  async userName(task: Task) {
    console.log(
      "You're not logged in yet. Fetching your username and password to log you in..."
    );
    const inputUserName = task.inputData?.userName || 'user2';
    const userName = await Promise.resolve(inputUserName);
    return {
      status: 'COMPLETED' as const,
      outputData: {
        result: userName,
      },
    };
  }
}

async function main() {
  // Configure the SDK
  void new ConductorWorkers();
  const clients = await OrkesClients.from(orkesConfig);
  const executor = clients.getWorkflowClient();

  // If the user isn't logged in, use this loop to log them in
  // Can be expanded for more conditional page load logic
  const logUserInTask = doWhileTask(
    'logUserIn_ref',
    'if ($.logUserIn_ref.iteration < 2 && $.loggedIn_ref?.output === false) { true } else { false }',
    [
      switchTask('switch_ref', '${loggedIn_ref.output.result}', {
        true: [],
        false: [
          simpleTask('userName_ref', 'userName', {
            userName: 'user1',
          }),
          simpleTask('loggedIn_task', 'loggedIn', { loggedIn: true }),
        ],
      }),
      simpleTask('locale_ref', 'locale', {
        loggedIn: '${loggedIn_ref.output.result}',
      }),
    ]
  );

  const workflow = new ConductorWorkflow(executor, 'pageLoadFlow')
    .add(simpleTask('greet_ref', 'greet', { name: '${workflow.input.name}' }))
    .add(simpleTask('loggedIn_ref', 'loggedIn', {}))
    .add(logUserInTask)
    .outputParameters({
      name: '${greet_ref.output.result}',
      locale: '${locale_ref.output.result}',
      userName: '${userName_ref.output.result}',
    });

  await workflow.register();

  // Start polling for tasks (auto-discovers @worker decorated functions).
  const handler = new TaskHandler({
    client: clients.getClient(),
    scanForDecorated: true,
  });
  // Workers here are defined with the decorators within the Workers class
  // TaskHandler is more modern; uses decorators; no manual worker registration; decoupled
  await handler.startWorkers();

  // Run the workflow and get the result.
  const run = await workflow.execute({ name: 'Friend' });
  console.log(`Hello ${run.output?.name} in locale ${run.output?.locale}!`);

  await handler.stopWorkers();
  process.exit(0);
}

main();
