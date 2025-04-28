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

## Features

### Project Structure

- **Per-User Inbox Projects:** Each user now has their own Inbox project, created automatically on registration. This ensures data isolation and user-specific task management.
- **No Global Inbox:** The legacy global Inbox project and its migrations have been fully removed. All logic and permissions now operate on a per-user basis.
- **Migration/Upgrade Note:** If upgrading from a previous version, legacy migrations and seeds for the global Inbox are no longer required and have been deleted. Existing users will have an Inbox project backfilled via migration.
- **Security & Simplicity:** This change improves user data isolation, simplifies permissions, and reduces technical debt.

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
