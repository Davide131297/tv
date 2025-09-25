# My Node.js Backend Project

This is a simple Node.js backend project built with Express and TypeScript. It serves as a starting point for building RESTful APIs.

## Project Structure

```
my-node-backend
├── src
│   ├── app.ts               # Entry point of the application
│   ├── controllers          # Contains controllers for handling requests
│   │   └── index.ts         # Index controller
│   ├── routes               # Contains route definitions
│   │   └── index.ts         # Route setup
│   └── types                # Custom TypeScript types
│       └── index.ts         # Type definitions
├── package.json             # NPM package configuration
├── tsconfig.json            # TypeScript configuration
└── README.md                # Project documentation
```

## Installation

To get started with this project, clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd my-node-backend
npm install
```

## Running the Application

To run the application in development mode, use the following command:

```bash
npm run dev
```

## API Endpoints

- `GET /` - Returns a welcome message.

## License

This project is licensed under the MIT License.
