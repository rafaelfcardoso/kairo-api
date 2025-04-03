test/
├── unit/                       # Unit tests
│   ├── domain/                 # Domain layer tests
│   │   ├── task-management/    # Task management domain tests
│   │   ├── scheduling/         # Scheduling domain tests
│   │   └── notification/       # Notification domain tests
│   ├── application/            # Application layer tests
│   │   ├── task-management/    # Task application services tests
│   │   ├── scheduling/         # Scheduling application tests
│   │   └── notification/       # Notification application tests
│   └── infrastructure/         # Infrastructure layer tests
│       ├── persistence/        # Repository implementation tests
│       └── services/           # External service tests
├── integration/                # Integration tests
│   ├── task-management/        # Task management integration tests
│   ├── scheduling/             # Scheduling integration tests
│   └── notification/           # Notification integration tests
├── e2e/                        # End-to-end tests
│   ├── api/                    # API endpoint tests
│   └── workflows/              # Workflow tests across multiple endpoints
├── acceptance/                 # Acceptance tests (BDD style)
├── test-utils/                 # Test utilities and helpers
│   ├── factories/              # Test data factories
│   ├── mocks/                  # Mock implementations
│   └── fixtures/               # Test fixtures
└── jest-setup.ts               # Jest configuration
