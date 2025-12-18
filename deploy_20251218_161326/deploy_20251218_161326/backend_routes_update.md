# Backend Routes Update Instructions

## Add Role Routes to Main App

You need to add the role routes to your main Express app. Add this line to your main app file (usually `app.js` or `server.js`):

```javascript
// Add this line with your other route imports
const roleRoutes = require('./routes/roleRoutes');

// Add this line with your other route registrations
app.use('/api/roles', roleRoutes);
```

## Complete Route Structure
Your routes should look like this:

```javascript
// Example of how your main routes file should look
app.use('/api/employees', employeeRoutes);
app.use('/api/platforms', platformRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/roles', roleRoutes); // <- Add this line
app.use('/api/recruitment', recruitmentRoutes);
// ... other routes
```

## API Endpoints Available
Once added, these endpoints will be available:

- `GET /api/roles` - Get all roles with pagination/filtering
- `GET /api/roles/names` - Get role names for dropdown
- `GET /api/roles/:id` - Get role by ID
- `POST /api/roles` - Create new role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role
- `GET /api/roles/health` - Health check