# PointageQR — Attendance Management

A web application that allows employees to clock in and out using QR codes and helps HR administrators manage attendance, employees, and leave requests.

## Features

- Authentication and role-based access for administrators and employees.
- QR code clock-in and clock-out.
- Personal attendance history.
- Employee management.
- Leave request submission and approval.
- Attendance dashboard and reports.

## Tech Stack

| Component | Technologies |
|-----------|--------------|
| Frontend | React.js, Vite, CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens (JWT), bcrypt |

## Project Structure

- `frontend/` — User interface.
- `backend/` — REST API, authentication, and business logic.

## Available Version

This repository contains the **QR code attendance version**.

A facial recognition attendance enhancement was also developed separately. Its source code is no longer available and is not included in this repository.

## Demo Data

All data used for development and demonstration is fictional. It does not represent real employees or their attendance records.

## Local Setup

### Prerequisites

- Node.js and npm.
- A running MongoDB instance.

### Install Dependencies

From the project root, install the backend dependencies:

```bash
cd backend
npm install
```

Then install the frontend dependencies:

```bash
cd ../frontend
npm install
```

### Configure Environment Variables

Create a `.env` file inside `backend/` with the following variables:

```dotenv
MONGO_URI=mongodb://localhost:27017/pointageqr
JWT_SECRET=replace_with_a_long_random_secret
```

Adjust the MongoDB connection URI to match your local environment and use your own JWT secret.

### Start the Application

Run the frontend and backend in separate terminals using the scripts defined in their respective `package.json` files.

## Excluded Files

The following files and directories are excluded from version control:

- `backend/node_modules/`
- `frontend/node_modules/`
- `backend/.env`
- `data/`

Local credentials and MongoDB database files are not required in the repository.
