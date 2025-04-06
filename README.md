# ISS Cargo Management System

## Docker Deployment

This application can be easily deployed using Docker. Follow these steps to build and run the application:

### Prerequisites
- Docker installed on your system

### Build the Docker Image
```bash
docker build -t iss-cargo-management .
```

### Run the Container
```bash
docker run -p 8000:8000 --network=host iss-cargo-management
```

The application will be accessible at:
- API: http://localhost:8000/api
- Frontend: The frontend is built and served through the backend in production mode

## Project Structure
- `backend/`: Node.js Express API server
- `frontend/`: React frontend application

## Technologies Used
- Backend: Node.js, Express, MongoDB
- Frontend: React
- Containerization: Docker

## API Endpoints
- `/api/items`: Manage items
- `/api/containers`: Manage containers
- `/api/waste`: Manage waste
- `/api/dashboard`: Get dashboard data
- `/api/placement`: Manage placements
- `/api/search`: Search functionality
- `/api/simulate`: Run simulations
- `/api/logs`: Access logs
- `/api/import`, `/api/export`: Import/Export data
- `/api/retrieve`: Retrieval operations

## Features

1. **Placement Recommendations (Priority Efficiency)**
   - Automatically suggest optimal placement for items
   - Rearrangement recommendations for existing items
   - Priority-based placement to keep important items accessible

2. **Item Search & Retrieval Optimization**
   - Find items by exact location
   - Optimized retrieval paths to minimize movement
   - Logging of retrieval actions

3. **Rearrangement Recommendations**
   - Space management for efficient storage
   - Step-by-step movement plans when rearrangement is needed

4. **Waste Management & Return Planning**
   - Tracking of expired or depleted items
   - Return planning for waste disposal
   - Weight-limited cargo return manifest

## Getting Started

### Docker Deployment (Recommended)

The easiest way to run the application is using Docker:

```bash
# Build the Docker image
docker build -t space-cargo-management .

# Run the container
docker run -p 8000:8000 space-cargo-management
```

### Manual Setup

#### Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start the server
npm start
```

#### Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

## API Documentation

### 1. Placement Recommendations API

**Endpoint:** `/api/placement`  
**Method:** POST  
**Description:** Calculate optimal placement for items in containers

#### Request Body:
```json
{
  "items": [
    {
      "itemId": "string",
      "name": "string",
      "width": 10,
      "depth": 20,
      "height": 5,
      "priority": 3,
      "expiryDate": "2025-01-01",
      "usageLimit": 10,
      "preferredZone": "A"
    }
  ],
  "containers": [
    {
      "containerId": "string",
      "zone": "A",
      "width": 100,
      "depth": 100,
      "height": 50
    }
  ]
}
```

### 2. Item Search and Retrieval API

**Endpoint:** `/api/search`  
**Method:** GET  
**Description:** Find items in the space station

#### Query Parameters:
- `itemId`: string
- `itemName`: string (Either itemName or itemId must be provided)
- `userId`: string (optional)

**Endpoint:** `/api/retrieve`  
**Method:** POST  
**Description:** Mark an item as retrieved

#### Request Body:
```json
{
  "itemId": "string",
  "userId": "string",
  "timestamp": "2023-01-01T00:00:00Z"
}
```

### 3. Waste Management API

**Endpoint:** `/api/waste/identify`  
**Method:** GET  
**Description:** Identify expired or depleted items

**Endpoint:** `/api/waste/return-plan`  
**Method:** POST  
**Description:** Create a plan for returning waste items

#### Request Body:
```json
{
  "undockingContainerId": "string",
  "undockingDate": "2023-01-01T00:00:00Z",
  "maxWeight": 1000
}
```

### 4. Time Simulation API

**Endpoint:** `/api/simulate/day`  
**Method:** POST  
**Description:** Simulate passing time to manage expiry dates and usage

#### Request Body:
```json
{
  "numOfDays": 7,
  "itemsToBeUsedPerDay": [
    { "itemId": "item123" }
  ]
}
```

### 5. Import/Export API

**Endpoint:** `/api/import/items`  
**Method:** POST  
**Description:** Import items via CSV upload

**Endpoint:** `/api/import/containers`  
**Method:** POST  
**Description:** Import containers via CSV upload

**Endpoint:** `/api/export/arrangement`  
**Method:** GET  
**Description:** Export current arrangement as CSV

### 6. Logging API

**Endpoint:** `/api/logs`  
**Method:** GET  
**Description:** Get logs of system activity

#### Query Parameters:
- `startDate`: string (ISO format)
- `endDate`: string (ISO format)
- `itemId`: string (optional)
- `userId`: string (optional)
- `actionType`: string (optional) 