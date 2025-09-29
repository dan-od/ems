// src/components/Assignments/AssignmentList.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AssignmentList = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const { data } = await api.get('/assignments');
        setAssignments(data);
      } catch (err) {
        console.error('Failed to fetch assignments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  // Render assignment list
  // ...
};

export default AssignmentList;