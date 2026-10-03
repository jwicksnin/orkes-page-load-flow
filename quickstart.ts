import { loadEnvFile } from 'node:process';
loadEnvFile();
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
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
    let name = task.inputData?.name;
    if (!name) {
      const reader = readline.createInterface({ input, output });
      name = await reader.question('What is your name? ');
      reader.close();
    }
    return {
      status: 'COMPLETED' as const,
      outputData: {
        result: `Hello, ${name}! Welcome to Orkes Conductor.`,
      },
    };
  }
  @worker({ taskDefName: 'loggedIn' })
  async loggedIn(task: Task) {
    // This is a stub for calling an API to check logged in status
    // If they are logged out, entered a username, get that status from the username task
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
    const reader = readline.createInterface({ input, output });
    const locale = await reader.question('What is your locale? ');
    reader.close();
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
    const reader = readline.createInterface({ input, output });
    const userName = await reader.question('Please tell me your username so I can log you in ');
    reader.close();
    return {
      status: 'COMPLETED' as const,
      outputData: {
        result: userName,
      },
    };
  }
}

async function main() {
  // Configure the SDK (reads CONDUCTOR_SERVER_URL / CONDUCTOR_AUTH_* from env).
  void new ConductorWorkers();
  const clients = await OrkesClients.from(orkesConfig);
  const executor = clients.getWorkflowClient();

  // If the user isn't logged in, use this loop to log them in
  // Can be expanded for more conditional page load logic
  const logUserInTask = doWhileTask(
    'logUserIn_ref',
    'if ($.logUserIn_ref.iteration < 2 && $.loggedIn_ref?.output === false) { true } else { false }',
    [
      simpleTask('userName_ref', 'userName', {
        question: 'Sorry, I need your username so I can log you in ',
      }),
      simpleTask('loggedIn_task', 'loggedIn', { loggedIn: true }),
      simpleTask('locale_task', 'locale', {
        loggedIn: '${loggedIn_task.output.result}',
      }),
    ]
  );

  const workflow = new ConductorWorkflow(executor, 'pageLoadFlow')
    .add(simpleTask('greet_ref', 'greet', { name: '${workflow.input.name}' }))
    .outputParameters({ result: '${greet_ref.output.result}' })
    .add(simpleTask('loggedIn_ref', 'loggedIn', {}))
    .add(
      switchTask('switch_ref', '${loggedIn_ref.output.result}', {
        true: [
          simpleTask('locale_ref', 'locale', {
            loggedIn: '${loggedIn_ref.output.result}',
          }),
        ],
        false: [
          logUserInTask,
        ],
      })
    );

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
  const run = await workflow.execute({ name: '' });
  console.log(`result: ${run.output?.result}`);

  await handler.stopWorkers();
}

main();
