# Intro to Orkes Conductor 
* Multi-step processes and "logic" that no one understands?
* Unmaintainable microservices tightly coupled in your codebase?
* Agents that need to be more predictable?
* Workflows that use AI and need human approvals?

If you're currently facing any of these issues or you wisely predict seeing them in the future, try Orkes Conductor orchestration layer. 

Looking for high-level architecture and philosophy? Check out [Orkes Academy](https://orkes.io/academy) for quick videos that provide background for implementation.

***Fun Fact:** According to the Cambridge dictionary, "Orkes" refers to a band or group of musicians, which is perfect for an orchestration layer!*

# Page Load Flow Tutorial
This codebase provides a jumping-off point for getting started with Orkes Conductor workflows using the [Typescript SDK](https://github.com/conductor-oss/javascript-sdk). The Page Load Flow is one example of coordinating complex microservice logic that Orkes Conductor was made for. The flow can be extended to LLMs, agents, and more complex tasks.

After going through this tutorial, you will be able to modify this example to fit your needs, use parts of it in an existing code project, or create a new Conductor project. 

Includes: 

* Up-to-date version-controlled Typescript project that only requires two commands to get started
* No need to fill in the blanks with Google searches or documentation deep dives
* Links to relevant Orkes Conductor documentation when you need it
* Tips and insights for using the SDK
* Minimal decision making

***Pro Tip:** Using JSON instead of the SDK  can be a quick and easy way to use the [Orkes UI](https://developer.orkescloud.com/). See the [documentation for plug-and-play examples](https://github.com/conductor-oss/awesome-conductor-apps/tree/main/javascript).* 

## Quick Start
1. Clone this repo 
1. `cd orkes-login-flow`
1. `touch .env` 
    * Using the .env file avoids the need to `export` the variables in your console
1. Go to the [Orkes UI to get your access keys](https://orkes.io/content/sdks/authentication#retrieving-access-keys)
1. Populate your .env file with your Orkes keys like this:
```
SERVER_URL="https://developer.orkescloud.com/api",
KEY_ID="[your Orkes key id here]",
KEY_SECRET="[your Orkes key secret here]",
```
5. `npm install`
6. `npx tsx quickstart.ts`

At this point, you will see the workflow start and prompt the user for input. Once you answer the questions, it will look like this:
```console
INFO Discovered 4 worker(s) via @worker decorator
...
result: "Hello, [your name here]! Welcome to Orkes Conductor."
INFO Stopping 4 worker(s)...
INFO All workers stopped
```

## Page Load Flow Logic
When working on customer-facing apps, initial page load can be tricky. Before anything can be displayed to the user, there are multiple service requests and state checks that need to be done. Orkes Conductor can coordinate state including:

* Logged in status
* Locale
* Experiments or A/B tests
* Persisted user data

The flow steps are:
1. Check logged in status
1. (If not logged in: Get username and update logged in status to true)
1. Ask the user for their locale
1. Display the greeting

## Components of The Page Load Flow

***TL;DR Conductor Key Concepts:** The workers poll the workflow to see when the workflow calls their associated task.*

### Workers
In the [`ConductorWorkers` class](quickstart.ts#L22), each worker is defined in a Typescript decorator and with an associated task.

Once the class is instantiated within `main()`, the [`TaskHandler`](quickstart.ts#L114) finds all the workers within the `ConductorWorkers` class. Note the `scanForDecorated` param:

```typescript
const handler = new TaskHandler({
    client: clients.getClient(),
    scanForDecorated: true,
  });
```
***Pro Tip:** `TaskHandler` is a more up-to-date version of `TaskManager` and allows use of Typescript decorators to avoid manual worker registration and tight coupling.*

### Workflow and Tasks
In [the workflow](quickstart.ts#L101), there are examples of how to add tasks and use tasks' output in other tasks.

For example, the output of the `loggedIn` task is a boolean, which is consumed by the [`switchTask`](quickstart.ts#L86).

***Note:** The logged in status is currently a random 1 or 0. You can replace the stub [here](quickstart.ts#L37) with your own API request to get the user's status dynamically.*

The `logUserInTask` is ready to be extended into more complex logic. Currently, if the user isn't logged in initially, this will loop over the log in steps until they are logged in. The [iterations condition is set to max 1 for safety](quickstart.ts#L84), but more complex conditions would work here. 

## Next Steps to Extend the Page Load Flow
* Add another task that "interrupts" the workflow, like the user suddenly being logged out or changing locale.
* Use [the Human task type](https://orkes.io/content/reference-docs/operators/human) to get user input. 
* Use an AI agent that gathers data or does an evaluation, then prompts for user input. See the [examples here](https://github.com/conductor-oss/javascript-sdk/tree/main/examples/agents) for ideas.
* Create an [API Gateway](https://orkes.io/content/developer-guides/api-gateway) or [MCP Gateway](https://orkes.io/content/developer-guides/mcp-gateway) for the workflow that your codebase and agents can call.







