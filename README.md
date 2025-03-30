<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# domain layer tests (DDD-focused)
$ npm run test:domain

# domain layer test coverage
$ npm run test:domain:cov

# test coverage
$ npm run test:cov
```

## Testing

The Zenith API follows a Domain-Driven Design (DDD) approach with comprehensive test coverage across all layers.

### Test Structure

Our tests are organized by architectural layers to ensure proper isolation and focus:

- **Domain Layer Tests**: Core business rules and domain logic
- **Application Layer Tests**: Use cases and application services
- **Infrastructure Layer Tests**: Repositories and external services
- **Interface Layer Tests**: Controllers and API endpoints
- **Integration Tests**: Cross-layer interactions
- **E2E Tests**: Full API workflows

The test directory structure follows this organization:

```
test/
├── unit/
│   ├── domain/            # Domain layer tests
│   │   └── task-management/
│   ├── application/       # Application layer tests
│   │   └── task-management/
│   ├── infrastructure/    # Infrastructure layer tests
│   │   └── task-management/
│   └── interface/         # Interface layer tests
│       └── task-management/
├── integration/           # Integration tests
│   └── task-management/
└── e2e/                   # End-to-end tests
```

### Running Tests

```bash
# All unit tests
npm run test

# Domain layer tests
npm run test:domain

# Application layer tests
npm run test:application

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Test coverage for domain layer
npm run test:domain:cov

# Test coverage for application layer
npm run test:application:cov

# Overall test coverage
npm run test:cov
```

### Test Coverage Documentation

We maintain detailed documentation of our testing strategy and progress:

- [Test Coverage Plan](docs/active/test-coverage-plan.md): Our overall plan for test coverage across all layers
- [Application Layer Test Plan](docs/active/application-layer-test-plan.md): Detailed plan for application layer tests
- [Domain Layer Test Plan](docs/active/domain-layer-test-plan.md): Detailed plan for domain layer tests
- [Project Management Tests Summary](docs/active/project-management-tests-summary.md): Summary of Project domain tests across all layers
- [Task Management Tests Summary](docs/active/task-management-tests-summary.md): Summary of Task domain tests across all layers

### AI Service Mocking

For testing, we've implemented a mock version of the AI service to provide deterministic responses without making actual HTTP calls to the external AI service.

To use the mocked AI service in tests:

1. Initialize the test application with `getTestApp(true)`
2. The mock service will provide predictable responses based on input patterns

See [AI Service Mocking Documentation](docs/ai-service-mocking.md) for details on the implementation and usage.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
