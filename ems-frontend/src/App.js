// src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/dashboard';
import EquipmentList from './components/Equipment/EquipmentList';
import EquipmentForm from './components/Equipment/EquipmentForm';
import UserManagement from './components/User/UserManagement';
import MaintenanceLogs from './components/Equipment/MaintenanceLog';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import DashboardHome from './components/Dashboard/DashboardHome';
import RequestList from './components/Requests/RequestList';
import RequestForm from './components/Requests/RequestForm';
import RequestDetail from './components/Requests/RequestDetail';
import Reports from './components/Reports/Reports';
import AssignRoles from './components/User/AssignRoles';
import AddUser from './components/User/AddUser';
import RequestHub from "./components/RequestHub/RequestHub";
import PPEForm from "./components/RequestHub/PPEForm";
import MaterialForm from "./components/RequestHub/MaterialForm";
import EquipmentRequestForm from "./components/RequestHub/EquipmentRequestForm";
import TransportForm from "./components/RequestHub/TransportForm";
import MaintenanceForm from "./components/RequestHub/MaintenanceForm";
import ManagerRequests from './components/Requests/ManagerRequests';

// NEW pages
import IssueCreate from './components/Issues/IssueCreate';
import ReturnCreate from './components/Returns/ReturnCreate';

function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/" element={<Login />} />

      {/* Protected Dashboard  */}
      <Route element={<ProtectedRoute allowedRoles={['admin', 'manager', 'engineer', 'staff']} />}>
        <Route path="/dashboard" element={<Dashboard />}>
          {/* Default landing */}
          <Route index element={<DashboardHome />} />

          {/* Equipment */}
          <Route path="all-equipment" element={<EquipmentList />} />
          <Route path="add-equipment" element={<EquipmentForm isPage={true}/>} />
          <Route path="under-maintenance" element={<MaintenanceLogs />} />

          {/* Requests */}
          <Route path="requests" element={<RequestHub />} />  {/* Request Hub */}
          <Route path="my-requests" element={<RequestList />} /> {/* User: My Requests */}
          <Route path="manager-requests" element={<ManagerRequests />} /> {/* Manager: Dept Requests */}
          <Route path="requests/list" element={<RequestList />} /> {/* (optional: keep or remove) */}
          <Route path="requests/:id" element={<RequestDetail />} />
          <Route path="new-request" element={<RequestForm />} />

          {/* Request Forms */}
          <Route path="requests/ppe" element={<PPEForm />} />
          <Route path="requests/material" element={<MaterialForm />} />
          <Route path="requests/equipment" element={<EquipmentRequestForm />} />
          <Route path="requests/transport" element={<TransportForm />} />
          <Route path="requests/maintenance" element={<MaintenanceForm />} />

          {/* Issues & Returns */}
          <Route path="issues/new" element={<IssueCreate />} />
          <Route path="returns/new" element={<ReturnCreate />} />

          {/* Reports */}
          <Route path="reports" element={<Reports />} />

          {/* Users (Admin only) */}
          <Route path="users" element={<AssignRoles />} />
          <Route path="add-user" element={<AddUser />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;