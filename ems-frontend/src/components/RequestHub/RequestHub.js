// ems-frontend/src/components/RequestHub/RequestHub.js
// FIXED VERSION - Proper absolute paths for navigation

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PPEForm from './PPEForm';
import TransportForm from './TransportForm';
import MaintenanceForm from './MaintenanceForm';
import EquipmentRequestForm from './EquipmentRequestForm';
import MaterialForm from './MaterialForm';

const RequestHub = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  
  // Get current path to determine if we're showing the hub or a form
  const currentPath = window.location.pathname;
  const pathSegments = currentPath.split('/');
  const formType = pathSegments[pathSegments.length - 1];
  
  // Define all request types with proper configuration
  const requestTypes = [
    { 
      key: 'ppe', 
      label: 'PPE Request',
      icon: '🦺',
      color: 'bg-blue-500',
      description: 'Request safety equipment and protective gear',
      component: PPEForm
    },
    { 
      key: 'material', 
      label: 'Material Request',
      icon: '📦',
      color: 'bg-green-500',
      description: 'Request office supplies and materials',
      component: MaterialForm
    },
    { 
      key: 'equipment', 
      label: 'Equipment Request',
      icon: '🔧',
      color: 'bg-orange-500',
      description: 'Request tools and field equipment',
      component: EquipmentRequestForm
    },
    { 
      key: 'transport', 
      label: 'Transport Request',
      icon: '🚗',
      color: 'bg-purple-500',
      description: 'Request vehicle for field operations',
      component: TransportForm
    },
    { 
      key: 'maintenance', 
      label: 'Maintenance Request',
      icon: '🛠️',
      color: 'bg-red-500',
      description: 'Report equipment issues and request repairs',
      component: MaintenanceForm
    }
  ];
  
  // Check if we should render a specific form
  const activeForm = requestTypes.find(rt => rt.key === formType);
  if (activeForm && activeForm.component) {
    const FormComponent = activeForm.component;
    return <FormComponent />;
  }
  
  // Otherwise, render the hub
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Request Hub
          </h2>
          <p className="text-gray-600">
            Select a request type to create a new request
          </p>
        </div>

        {/* Request Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requestTypes.map((form) => (
            <Link
              key={form.key}
              to={`/dashboard/requests/${form.key}`}  // FIXED: Use absolute path
              className="group block bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-orange-400 cursor-pointer"
            >
              {/* Card Header with Icon */}
              <div className={`${form.color} bg-opacity-10 p-6 group-hover:bg-opacity-20 transition-all`}>
                <span className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${form.color} bg-opacity-20 text-4xl`}>
                  {form.icon}
                </span>
              </div>
              
              {/* Card Body */}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-orange-600 transition-colors">
                  {form.label}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {form.description}
                </p>
                
                {/* Arrow Icon */}
                <div className="flex items-center text-orange-500 font-medium">
                  <span className="mr-2">Create Request</span>
                  <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions for Common Requests */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/dashboard/requests/ppe')}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
            >
              🦺 Safety Boots
            </button>
            <button
              onClick={() => navigate('/dashboard/requests/ppe')}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
            >
              🦺 Hard Hat
            </button>
            <button
              onClick={() => navigate('/dashboard/requests/transport')}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
            >
              🚗 Field Transport
            </button>
            <button
              onClick={() => navigate('/dashboard/requests/maintenance')}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
            >
              🛠️ Equipment Repair
            </button>
            <button
              onClick={() => navigate('/dashboard/requests/material')}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
            >
              📦 Office Supplies
            </button>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-orange-50 rounded-lg p-6 border-l-4 border-orange-400">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            📌 Request Guidelines
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• All requests require manager approval before processing</li>
            <li>• Mark urgent requests with high priority for faster processing</li>
            <li>• Provide detailed descriptions to avoid delays</li>
            <li>• You can track your request status in "My Requests"</li>
            <li>• For emergency requests, also contact your department manager directly</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RequestHub;